import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import Router from 'next/router'
import { setCookie, parseCookies, destroyCookie } from "nookies";
import { api } from "../services/apiClient";

type User = {
  email: string;
  permissions: string[];
  roles: string[];
}

type AuthProviderProps = {
  children: ReactNode;
}

type SignInCredentials = {
  email: string;
  password: string;
}

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>
  signOut(): void;
  isAuthenticated: boolean;
  user: User;
}

const AuthContext = createContext({} as AuthContextData)

let authChannel: BroadcastChannel;

export function signOut(broadcasted = false) {
  destroyCookie(undefined, 'nextauth.token')
  destroyCookie(undefined, 'nextauth.refreshToken')
  console.log({broadcasted})

  if(!broadcasted){
    authChannel.postMessage('signOut');
  }

  Router.push('/')
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>({} as User);
  const isAuthenticated = !!user;

  //one useEffect per responsability
  useEffect(() => {
    authChannel = new BroadcastChannel('auth');

    authChannel.onmessage = (message) => {
      console.log(message)
      switch(message.data){
        case 'signOut':
          signOut(true);
          break;
        case 'signIn':
          Router.push('/dashboard');
        default:
          break;
      }
    }
  }, [])

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies()

    if (token) {
      api.get('/me').then(response => {
        setUser(response.data)
      })
      .catch(error => {
        signOut();
      })
    }
  }, [])

  async function signIn({ email, password }: SignInCredentials) {
    try{
      const response = await api.post('sessions', {
        email,
        password
      })

      const { permissions, roles, token, refreshToken } = response.data;

      setCookie(undefined, 'nextauth.token', token, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/' // glboal cookie
      })

      setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/' // glboal cookie
      })


      setUser({
        email,
        permissions,
        roles,
      })

      api.defaults.headers['Authorization'] = `Bearer ${token}`;

      Router.push('/dashboard');
      
      authChannel.postMessage('signIn');
    } catch(e) {
      console.log(e)
    }

  }

  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  return useContext(AuthContext)
}

export {
  AuthProvider,
  useAuth
}