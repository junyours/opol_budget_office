// services/authService.ts
import API from "./api";
import { tokenService } from "./tokenService";
import { User } from "../types/api";

export const authService = {
  async login(username: string, password: string) {
    const res = await API.post("/auth/login", {
      username,
      password,
    });

    // const { token, refresh_token, user } = res.data;

    // tokenService.setAccessToken(token);
    // tokenService.setRefreshToken(refresh_token);
    const { token, user } = res.data;

    tokenService.setAccessToken(token);

    return user as User;
  },

  async logout() {
    try {
      await API.post("/auth/logout");
    } catch (e) {}

    tokenService.clear();
  },
};