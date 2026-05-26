'use client'

import { useTransition } from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { deleteCover } from './actions'

export function DeleteButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-destructive">
            刪除
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定刪除「{title}」？</AlertDialogTitle>
          <AlertDialogDescription>連同所有平台連結一起刪除，無法復原。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogPrimitive.Close
            disabled={pending}
            onClick={() => startTransition(() => deleteCover(id))}
            render={
              <Button
                variant="default"
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                )}
              />
            }
          >
            {pending ? '刪除中⋯' : '確定刪除'}
          </AlertDialogPrimitive.Close>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
