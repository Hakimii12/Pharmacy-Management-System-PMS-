import { baseApi } from "./baseApi"
import { db } from "@/offline/db"
import type { AppNotification, LowStockRow, NearExpiryRow, Paginated } from "@/types"

type NotificationPage = Paginated<AppNotification> & { unreadCount: number }

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationPage, { page?: number; limit?: number; read?: string; type?: string }>({
      query: (params) => ({ url: "/notify/notification", params }),
      providesTags: (result) => [
        { type: "Notification" as const, id: "LIST" },
        ...(result?.data ?? []).map((row) => ({ type: "Notification" as const, id: row._id })),
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data.data.length) await db.notifications.bulkPut(data.data)
        } catch {
          // Offline read already came from Dexie.
        }
      },
    }),

    /** Lightweight badge count, polled far more often than the full list. */
    getUnreadCount: builder.query<{ unreadCount: number }, void>({
      query: () => "/notify/unreadCount",
      providesTags: [{ type: "Notification", id: "UNREAD" }],
    }),

    markNotificationRead: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/notify/notification/${id}`, method: "PUT" }),
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        // Flip the row locally straight away — the badge should not lag a tap.
        const patches = notificationApi.util.selectInvalidatedBy(getState(), [
          { type: "Notification", id: "LIST" },
        ])

        const undos = patches.map(({ originalArgs }) =>
          dispatch(
            notificationApi.util.updateQueryData("getNotifications", originalArgs, (draft) => {
              const row = draft.data.find((item) => item._id === id)
              if (row && !row.read) {
                row.read = true
                draft.unreadCount = Math.max(0, draft.unreadCount - 1)
              }
            }),
          ),
        )

        try {
          await queryFulfilled
        } catch {
          undos.forEach((undo) => undo.undo())
        }
      },
      invalidatesTags: [{ type: "Notification", id: "UNREAD" }],
    }),

    markAllNotificationsRead: builder.mutation<{ message: string }, void>({
      query: () => ({ url: "/notify/MarkAsReadAll", method: "PUT" }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "UNREAD" },
      ],
    }),

    deleteNotification: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/notify/removeNotification/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Notification", id },
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "UNREAD" },
      ],
    }),

    getLowStock: builder.query<Paginated<LowStockRow>, { page?: number; limit?: number; location?: string }>({
      query: (params) => ({ url: "/notify/getLowStock", params }),
      providesTags: [{ type: "Report", id: "LOW_STOCK" }],
    }),

    getNearExpiry: builder.query<Paginated<NearExpiryRow>, { page?: number; limit?: number; days?: number }>({
      query: (params) => ({ url: "/notify/getNearExpiryProducts", params }),
      providesTags: [{ type: "Report", id: "NEAR_EXPIRY" }],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useGetLowStockQuery,
  useGetNearExpiryQuery,
} = notificationApi
