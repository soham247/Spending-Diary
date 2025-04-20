"use client"

import { BarChart3, ChartNoAxesCombined, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

function BottomNavigation() {
  const pathname = usePathname()

  const items = [
    {
      name: "Expenses",
      icon: <BarChart3 size={16} />,
      link: "/expense",
    },
    {
      name: "Friends",
      icon: <Users size={16} />,
      link: "/friends",
    },
    {
      name: "Analytics",
      icon: <ChartNoAxesCombined size={16} />,
      link: "/analytics",
    }
  ]

  return (
    <nav className="md:hidden fixed bottom-0 bg-transparent backdrop-blur-md border-t border-accent/10 w-full z-50 px-4 pt-2">
      <div className="shadow-lg rounded-t-lg flex justify-between items-center px-4 py-2 mb-2">
        {items.map((item) => (
          <Link 
            key={item.name} 
            href={item.link} 
            className={`flex flex-col items-center ${
              pathname === item.link ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {item.icon}
            <span className="text-xs">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default BottomNavigation