import { baseApi } from "./baseApi"
import { db } from "@/offline/db"
import type { Paginated, ReferenceEntry } from "@/types"

/**
 * Categories and dosage forms populate almost every form in the app, so both are
 * mirrored to IndexedDB — a product form that cannot render its dropdowns is
 * useless offline.
 */
export const catalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<Paginated<ReferenceEntry>, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/form/categories", params: params || undefined }),
      providesTags: (result) => [
        { type: "Category" as const, id: "LIST" },
        ...(result?.data ?? []).map((row) => ({ type: "Category" as const, id: row._id })),
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data.data.length) await db.categories.bulkPut(data.data)
        } catch {
          // Served from cache.
        }
      },
    }),

    createCategory: builder.mutation<{ message: string; category: ReferenceEntry }, { name: string }>({
      query: (body) => ({ url: "/form/categories", method: "POST", body }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),

    /** Rejected with a `productCount` when the category is still in use. */
    deleteCategory: builder.mutation<{ message: string; productCount?: number }, string>({
      query: (id) => ({ url: `/form/categories/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),

    getDosageForms: builder.query<Paginated<ReferenceEntry>, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/form/dosage-forms", params: params || undefined }),
      providesTags: (result) => [
        { type: "DosageForm" as const, id: "LIST" },
        ...(result?.data ?? []).map((row) => ({ type: "DosageForm" as const, id: row._id })),
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data.data.length) await db.dosageForms.bulkPut(data.data)
        } catch {
          // Served from cache.
        }
      },
    }),

    createDosageForm: builder.mutation<{ message: string; dosageForm: ReferenceEntry }, { name: string }>({
      query: (body) => ({ url: "/form/dosage-forms", method: "POST", body }),
      invalidatesTags: [{ type: "DosageForm", id: "LIST" }],
    }),

    deleteDosageForm: builder.mutation<{ message: string; productCount?: number }, string>({
      query: (id) => ({ url: `/form/dosage-forms/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "DosageForm", id: "LIST" }],
    }),
  }),
})

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetDosageFormsQuery,
  useCreateDosageFormMutation,
  useDeleteDosageFormMutation,
} = catalogApi
