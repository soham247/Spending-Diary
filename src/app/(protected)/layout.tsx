"use client"
import Header from "@/components/Header"
import React from "react"

const Layout = ({ children }: {children: React.ReactNode}) => {

    return(
        <div>
            <Header />
            <div>{children}</div>
        </div>
    )
}

export default Layout