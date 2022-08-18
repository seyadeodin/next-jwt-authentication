import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { signOut } from '../context/AuthContext';
import { AuthTokenError } from '../errors/AuthTokenError';

interface AxiosErrorResponse {
  code?: string;
}

let isRefreshing = false;
let failedRequestsQueue = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  })

  api.interceptors.response.use(response => {
    return response;
  }, (error: AxiosError<AxiosErrorResponse>) => {
    if(!error.response){
      return
    }

    if (error.response.status === 401) {
      if (error.response.data?.code === 'token.expired') { 
        cookies = parseCookies();

        const { 'nextauth.refreshToken': refreshToken } = cookies;
        const originalConfig = error.config;

        if(!isRefreshing) {
          isRefreshing = true;  

          api.post('/refresh', {
            refreshToken,
          }).then(response => {
            const { token } = response.data;

            setCookie(ctx, 'nextauth.token', token, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/' // glboal cookie
            })

            setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/' // glboal cookie
            })

            failedRequestsQueue.forEach((request: any) => request.resolve(token))
            failedRequestsQueue = [];
          }).catch(err => {
            failedRequestsQueue.forEach((request: any) => request?.reject(err));
            failedRequestsQueue = [];

            if (process.browser) {
              signOut();
            }
          }).finally (() => {
            isRefreshing = false;
          })
        }

        //axios does not accept async so we use promises
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            resolve: (token: string) => {
              originalConfig.headers['Authorization'] = `Bearer ${token}`;

              resolve(api(originalConfig))
            },
            reject: (err: AxiosError) => {
              reject(err)
            },
          })
        })

      } else {
        if (process.browser) {
          signOut();
        } 
      }
    }

    return Promise.reject(error);
  })

  return api;
}