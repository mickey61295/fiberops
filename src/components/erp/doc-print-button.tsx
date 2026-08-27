'use client'

/**
 * DocPrintButton — SPEC-M8 §5: the copy-selector print door for doc sheets
 * (the report PrintButton pattern, doc edition). On the /print route it
 * re-sets ?copy= and calls window.print() in place; on doc VIEW pages it is
 * rendered as a plain link variant that opens the print route.
 */
import Link from 'next/link'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const COPIES = ['original', 'duplicate', 'triplicate'] as const
const LABEL: Record<string, string> = {
  original: 'Original',
  duplicate: 'Duplicate',
  triplicate: 'Triplicate',
}

/** In-place variant (print route): swap ?copy= → window.print(). */
export function DocPrintButton({ docType, id }: { docType: string; id: string }) {
  const print = (copy: (typeof COPIES)[number]) => {
    const url = new URL(window.location.href)
    url.searchParams.set('copy', copy)
    url.searchParams.set('autoprint', '0') // manual click = user keeps control
    window.history.replaceState(null, '', url.toString())
    window.print()
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
            {LABEL[c]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Link variant (doc view pages): opens the print route. */
export function DocPrintLink({ docType, id }: { docType: string; id: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`/print/${docType}/${encodeURIComponent(id)}?copy=original`}>
        <Printer className="h-3.5 w-3.5 mr-1" /> Print
      </Link>
    </Button>
  )
}
