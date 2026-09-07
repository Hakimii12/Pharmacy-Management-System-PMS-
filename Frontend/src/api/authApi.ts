import { baseApi } from "./baseApi"
import type { AuthUser, Paginated, Role, User, UserStatus } from "@/types"

export interface LoginRequest {
  email: string
  password: string
}

/** `LoginUser` responds with the user object itself, not a wrapper. */
export type LoginResponse = AuthUser

export interface RegisterRequest {
  name: string
  email: string
  password: string
  role: Role
}

/** The approval route takes an action verb as a path segment. */
export type ApprovalAction = "approve" | "suspend" | "reject"

export interface UserListQuery {
  page?: number
  limit?: number
  search?: string
  role?: Role | ""
  status?: UserStatus | ""
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/user/login", method: "POST", body }),
    }),

    register: builder.mutation<{ message: string }, RegisterRequest>({
      query: (body) => ({ url: "/user/register", method: "POST", body }),
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({ url: "/user/logout", method: "POST" }),
    }),

    getUser: builder.query<User, string>({
      query: (id) => `/user/user/${id}`,
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),

    getUsers: builder.query<Paginated<User>, UserListQuery>({
      query: (params) => ({ url: "/user/getAllUser", params }),
      providesTags: (result) => [
        { type: "User" as const, id: "LIST" },
        ...(result?.data ?? []).map((user) => ({ type: "User" as const, id: user._id })),
      ],
    }),

    moderateUser: builder.mutation<{ message: string; user: User }, { id: string; action: ApprovalAction }>({
      query: ({ id, action }) => ({ url: `/user/approval/${action}/${id}`, method: "POST" }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),

    // Only superAdmin may call this, and the backend rejects any role but "admin".
    createAdmin: builder.mutation<{ message: string; user: User }, Omit<RegisterRequest, "role">>({
      query: (body) => ({ url: "/user/adminRegister", method: "POST", body: { ...body, role: "admin" } }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetUserQuery,
  useGetUsersQuery,
  useModerateUserMutation,
  useCreateAdminMutation,
} = authApi
