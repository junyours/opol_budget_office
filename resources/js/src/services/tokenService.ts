// // services/tokenService.ts
// const ACCESS_TOKEN = "access_token";
// const REFRESH_TOKEN = "refresh_token";

// export const tokenService = {
//   getAccessToken: () => localStorage.getItem(ACCESS_TOKEN),

//   setAccessToken: (token: string) =>
//     localStorage.setItem(ACCESS_TOKEN, token),

//   getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN),

//   setRefreshToken: (token: string) =>
//     localStorage.setItem(REFRESH_TOKEN, token),

//   clear: () => {
//     localStorage.removeItem(ACCESS_TOKEN);
//     localStorage.removeItem(REFRESH_TOKEN);
//   },
// };

const ACCESS_TOKEN = "access_token";

export const tokenService = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN),

  setAccessToken: (token: string) =>
    localStorage.setItem(ACCESS_TOKEN, token),

  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN);
  },
};