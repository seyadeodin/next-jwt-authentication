import { FormEvent, useState } from 'react'
import type { GetServerSideProps, NextPage } from 'next'
import { parseCookies } from 'nookies'

import styles from '../styles/Home.module.css'
import { useAuth } from '../context/AuthContext'
import { withSSRGuest } from '../utils/withSSRGuest'

const Home: NextPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { signIn } = useAuth();

  async function handleSubmit(e: FormEvent){
    e.preventDefault();
    const data = {
      email,
      password,
    }

    await signIn(data)
  }

  return(
    <div className={styles.div}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input type="email" value={email} onChange={e=> setEmail(e.target.value)}/>
        <input type="password" value={password} onChange={e=> setPassword(e.target.value)}/>
        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}

export const getServerSideProps = withSSRGuest(async (ctx) => {

  return {
    props:{
      
    }

  }
});

export default Home
