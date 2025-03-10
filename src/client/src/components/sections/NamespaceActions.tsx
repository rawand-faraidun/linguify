import { useState } from 'react'
import { LuMoreVertical } from 'react-icons/lu'
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { useToast } from '../ui/use-toast'
import request from '@lib/functions/request'
import { DeleteApi, PutApi } from '@lib/interfaces/api/Api'
import { EditNamespace, NS } from '@lib/interfaces/api/Namespace'

/**
 * component props
 */
export interface Props {
  ns: NS
  onUpdate?: (props: EditNamespace) => void
  onDelete?: () => void
}

/**
 * Namespace actions dropdown
 *
 * @param props - component props
 *
 * @returns namespace actions dropdown component
 */
const NamespaceActions = ({ ns, onUpdate, onDelete }: Props) => {
  const { toast } = useToast()
  const namespace = ns.replace('.json', '')
  const [data, setData] = useState<EditNamespace>({ namespace: namespace })
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // update namespace handler
  const handleSubmit: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { data: updated, message }
      } = await request<PutApi<EditNamespace>>(`/namespace/${ns}`, { method: 'PUT', data: data })
      toast({ title: message })
      setData({ namespace: namespace })
      if (onUpdate) onUpdate(updated)
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  // delete namespace handler
  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<DeleteApi<EditNamespace>>(`/namespace/${ns}`, { method: 'DELETE' })
      toast({ title: message })
      if (onDelete) onDelete()
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <LuMoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={e => e.stopPropagation()} onSelect={() => setIsUpdateOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => e.stopPropagation()} onSelect={() => setIsDeleteOpen(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* update namespace dialog */}
      <Dialog modal open={isUpdateOpen} onOpenChange={open => setIsUpdateOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit namespace</DialogTitle>
            <DialogDescription>
              Edit <code className="text-foreground">{namespace}</code> translation namespace
            </DialogDescription>
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
              <Button onClick={handleSubmit}>Save</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete namespace dialog */}
      <Dialog modal open={isDeleteOpen} onOpenChange={open => setIsDeleteOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete namespace</DialogTitle>
            <DialogDescription>
              Are you sure to delete <code className="text-foreground">{namespace}</code> translation namespace?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default NamespaceActions
