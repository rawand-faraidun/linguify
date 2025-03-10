import { useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useToast } from '../ui/use-toast'
import request from '@lib/functions/request'
import { PostApi } from '@lib/interfaces/api/Api'
import { AddNamespace as AddNamespaceType } from '@lib/interfaces/api/Namespace'

/**
 * component props
 */
interface Props {
  onSuccess: () => void
}

/**
 * Add Namespace
 *
 * @param props - component props
 *
 * @returns add namespace component
 */
const AddNamespace = ({ onSuccess }: Props) => {
  const { toast } = useToast()
  const [data, setData] = useState<AddNamespaceType>({ namespace: '' })

  // add namespace handler
  const handleSubmit: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<PostApi>('/namespace', { method: 'POST', data: data })
      toast({ title: message })
      setData({ namespace: '' })
      onSuccess()
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  return (
    <>
      {/* new namespace dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-full w-full p-6">
            <LuPlus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New namespace</DialogTitle>
            <DialogDescription>Create new translation namespace</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-8 py-4">
            <Input
              id="namespace"
              name="namespace"
              value={data.namespace}
              onChange={e => setData({ namespace: e.target.value })}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={handleSubmit}>Add</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AddNamespace
