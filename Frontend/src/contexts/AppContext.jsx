import { createContext, useEffect } from "react";
export const ContextProvider=createContext()
import React from 'react'
import { useState } from "react";
function ContextApi({children}) {
  const [auth,setAuth]=useState('login')
  const [isAuth,setIsAuth]=useState(
    () => {
      const user = localStorage.getItem("user-threads");
      return !!user;
    }
  )
  
  const user=localStorage.getItem("user-threads")
  const data={
    auth,setAuth,
    isAuth,setIsAuth
  }
  return (
    <ContextProvider.Provider value={data}>
        {children}
    </ContextProvider.Provider>

  )
}

export default ContextApi
