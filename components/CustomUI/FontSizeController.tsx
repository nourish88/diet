

'use client'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {useFontStore} from "@/store/store";




export default function FontSizeController() {
    const { fontSize, increase, decrease } = useFontStore()

    return (
        <div className="fixed bottom-4 right-4 flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg z-50">
            <Button
                variant="ghost"
                size="icon"
                onClick={increase}
                className="hover:bg-blue-100"
            >
                <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={decrease}
                className="hover:bg-blue-100"
            >
                <ZoomOut className="h-4 w-4" />
            </Button>
        </div>
    )
}