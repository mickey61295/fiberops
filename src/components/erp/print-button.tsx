'use client'

/**
 * PrintButton — SPEC-M6 §4 (W7 print slice). Client component: copy selector
 * (Original | Duplicate | Triplicate — the legacy 3-template convention) +
 * window.print(). The ?copy= param renders the print-only header banner.
 */
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const COPIES = ['Original', 'Duplicate', 'Triplicate'] as const

export function PrintButton({ route }: { route: string }) {
  const print = (copy: (typeof COPIES)[number]) => {
    const url = new URL(window.location.href)
    url.searchParams.set('copy', copy.toLowerCase())
    window.history.replaceState(null, '', url.toString())
    window.print()
    // restore the URL without the copy param (it only matters for the banner)
    url.searchParams.delete('copy')
    window.history.replaceState(null, '', url.toString())
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {COPIES.map((c) => (
          <DropdownMenuItem key={c} onClick={() => print(c)}>
            {c}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
