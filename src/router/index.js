import { createRouter, createWebHashHistory } from "vue-router";

import MainPage from "../UserPage/mainPage/index.vue";
import HomePage from "../UserPage/homePage/index.vue";
import LoginPage from "../UserPage/loginPage/login.vue";
import RegisterPage from "../UserPage/loginPage/register.vue";
import myTicket from "../UserPage/myTicketPage/index.vue";
import ShowtimesPage from "../UserPage/showtimesPage/index.vue";
import SeatsPage from "../UserPage/seatsPage/index.vue";
import BookingConfirmPage from "../UserPage/bookingConfirmPage/index.vue";
import ProfilePage from "../UserPage/profilePage/index.vue";

import AdminMainPage from "../AdminPage/mainPage/index.vue";
import AdminHomePage from "../AdminPage/homePage/index.vue";
import AdminLoginPage from "../AdminPage/loginPage/login.vue";
import AdminLogoutPage from "../AdminPage/loginPage/logout.vue";
import AdminMoviesPage from "../AdminPage/moviesPage/index.vue";
import AdminShowtimesPage from "../AdminPage/showtimesPage/index.vue";
import AdminUsersPage from "../AdminPage/usersPage/index.vue";
import AdminBookingsPage from "../AdminPage/bookingsPage/index.vue";
import AdminAuditLogsPage from "../AdminPage/auditLogsPage/index.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: MainPage,
      children: [
        {
          path: "/",
          name: "home",
          component: HomePage,
          meta: { requiresAuth: true },
        },
        {
          path: "/my-ticket",
          name: "my-ticket",
          component: myTicket,
          meta: { requiresAuth: true },
        },
        {
          path: "/movies/:movieId/showtimes",
          name: "showtimes",
          component: ShowtimesPage,
          meta: { requiresAuth: true },
        },
        {
          path: "/showtimes/:showtimeId/seats",
          name: "seats",
          component: SeatsPage,
          meta: { requiresAuth: true },
        },
        {
          path: "/booking/confirm",
          name: "booking-confirm",
          component: BookingConfirmPage,
          meta: { requiresAuth: true },
        },
        {
          path: "/profile",
          name: "profile",
          component: ProfilePage,
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: "/login",
      component: LoginPage,
    },
    {
      path: "/register",
      component: RegisterPage,
    },
    {
      path: "/admin/login",
      name: "admin-login",
      component: AdminLoginPage,
    },
    {
      path: "/admin/logout",
      name: "admin-logout",
      component: AdminLogoutPage,
    },
    {
      path: "/admin",
      component: AdminMainPage,
      children: [
        {
          path: "",
          name: "admin-home",
          component: AdminHomePage,
        },
        {
          path: "movies",
          name: "admin-movies",
          component: AdminMoviesPage,
        },
        {
          path: "showtimes",
          name: "admin-showtimes",
          component: AdminShowtimesPage,
        },
        {
          path: "users",
          name: "admin-users",
          component: AdminUsersPage,
        },
        {
          path: "bookings",
          name: "admin-bookings",
          component: AdminBookingsPage,
        },
        {
          path: "audit-logs",
          name: "admin-audit-logs",
          component: AdminAuditLogsPage,
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const isAdminRoute = to.path.startsWith("/admin");
  const isAdminAuthRoute = to.name === "admin-login" || to.name === "admin-logout";

  const hasAdminSession = !!localStorage.getItem("admin_token");

  if (isAdminRoute && !isAdminAuthRoute && !hasAdminSession) {
    return { name: "admin-login" };
  }

  if (to.name === "admin-login" && hasAdminSession) {
    return { name: "admin-home" };
  }

  // Both email/password login and Google sign-in now return a JWT.
  const hasUserSession = !!localStorage.getItem("token");

  if (to.meta?.requiresAuth && !hasUserSession) {
    return { path: "/login" };
  }

  if (to.path === "/login" && hasUserSession) {
    return { name: "home" };
  }
});

export default router;
