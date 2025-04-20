"use client"

import BottomNavigation from "@/components/BottomNavigation"

const Layout = ({ children }: {children: React.ReactNode}) => {

    return(
        <div className="pb-5 md:pb-0">
            {children}
            <BottomNavigation />
        </div>
    )
}

export default Layout