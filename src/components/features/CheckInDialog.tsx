'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Label } from '@/components/ui'

interface CheckInDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (completedAt: string) => void
  planName: string
}

function formatLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function CheckInDialog({ isOpen, onClose, onConfirm, planName }: CheckInDialogProps) {
  const [datetime, setDatetime] = useState('')

  useEffect(() => {
    if (isOpen) {
      setDatetime(formatLocalDatetime(new Date()))
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleConfirm() {
    if (!datetime) return
    onConfirm(datetime)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-lg p-6 w-80 space-y-4">
        <h2 className="text-lg font-semibold">打卡确认</h2>
        <p className="text-sm text-muted-foreground">{planName}</p>
        <div className="space-y-2">
          <Label htmlFor="checkin-datetime">打卡时间</Label>
          <Input
            id="checkin-datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            确认打卡
          </Button>
        </div>
      </div>
    </div>
  )
}
