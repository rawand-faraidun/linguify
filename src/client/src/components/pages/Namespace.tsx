import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppContext } from '../context/AppContext'
import Svg from '../Svg'
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
import { EditNamespace } from '@lib/interfaces/api/Namespace'

/**
 * component props
 */
interface Props {
  ns: string
  onSuccess: () => void
}

/**
 * Namespace card
 *
 * @param props - component props
 *
 * @returns namespace card component
 */
const NamespaceCard = ({ ns, onSuccess }: Props) => {
  const namespace = ns.replace('.json', '')
  const { config } = useContext(AppContext)

  return (
    <div className="relative">
      <Link to={`/${ns}`}>
        <Card key={ns} className="relative">
          <CardHeader>
            <CardTitle>{namespace}</CardTitle>
            <CardDescription>
              {config?.localesPath}/{'{locale}'}/{ns}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      {/* card actions */}
      <div className="absolute top-0 right-0 z-10">
        <NamespaceActions ns={ns} onSuccess={onSuccess} />
      </div>
    </div>
  )
}

/**
 * Namespace actions dropdown
 *
 * @param props - component props
 *
 * @returns namespace actions dropdown component
 */
export const NamespaceActions = ({ ns, onSuccess }: Props) => {
  const namespace = ns.replace('.json', '')
  const [data, setData] = useState<EditNamespace>({ namespace: namespace })
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { toast } = useToast()

  // update namespace handler
  const handleSubmit: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<PutApi>(`/namespace/${ns}`, { method: 'PUT', data: data })
      toast({ title: message })
      setData({ namespace: namespace })
      onSuccess()
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  // update namespace handler
  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<DeleteApi>(`/namespace/${ns}`, { method: 'DELETE' })
      toast({ title: message })
      onSuccess()
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="aspect-square p-1">
            <Svg
              paths={[
                'M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z'
              ]}
            />
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
          <div className="py-4 grid grid-cols-1 gap-8">
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

export default NamespaceCard
