"use client"
import Header from "@/components/Header"

const Layout = ({ children }: {children: React.ReactNode}) => {

    return(
        <div>
            <Header />
            <div>{children}</div>
        </div>
    )
}

export default Layout