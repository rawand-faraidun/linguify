import { Dispatch, SetStateAction, useContext, useState } from 'react'
import { useClipboard } from '@mantine/hooks'
import { LuMoreVertical } from 'react-icons/lu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { AppContext } from '../context/AppContext'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import { useToast } from '../ui/use-toast'
import request from '@lib/functions/request'
import { DeleteApi, PutApi } from '@lib/interfaces/api/Api'
import { EditKey, Key } from '@lib/interfaces/api/Key'
import { NS } from '@lib/interfaces/api/Namespace'

/**
 * component props
 */
interface Props {
  namespace: NS
  data: Key
  setSelected: Dispatch<SetStateAction<string[]>>
  onSuccess: () => void
}

/**
 * sub props
 */
interface SubProps {
  data: string
}

/**
 * Key actions dropdown
 *
 * @param props - component props
 *
 * @returns key actions dropdown component
 */
const KeyActions = ({ namespace, data, setSelected, onSuccess }: Props) => {
  const { toast } = useToast()
  const { copy } = useClipboard()
  const { config } = useContext(AppContext)
  const [editing, setEditing] = useState<EditKey | null>(null)
  const keyTranslations = config?.otherLocales.reduce((obj, locale) => ({ ...obj, [locale]: '' }), {}) || {}

  // update key handler
  const handleSubmit: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<PutApi>(`/namespace/${namespace}/key`, { method: 'PUT', data: editing })
      toast({ title: message })
      setEditing(null)
      onSuccess()
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  // delete key handler
  const handleDelete: React.MouseEventHandler<HTMLDivElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<DeleteApi>(`/namespace/${namespace}/key`, { method: 'DELETE', data: { keys: [data.key] } })
      toast({ title: message })
      setSelected([])
      onSuccess()
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
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                toast({ title: 'Coppied key' })
                copy(data.key)
              }}
            >
              Copy key
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                toast({ title: 'Coppied value' })
                copy(data.value)
              }}
            >
              Copy value
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                setEditing({ ...data, oldKey: data.key })
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* edit key */}
      <Dialog modal open={editing != null} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit key</DialogTitle>
            <DialogDescription>
              Edit translation key <br />
              <span>Note: Default value will be assigned to any empty locale value</span>
            </DialogDescription>
          </DialogHeader>
          {editing != null && (
            <ScrollArea className="max-h-[50vh]">
              <div className="grid grid-cols-1 gap-8 py-4 pl-1 pr-3">
                <div className="flex flex-col gap-3">
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    name="key"
                    value={editing.key}
                    onChange={e => setEditing(prev => (prev != null ? { ...prev, key: e.target.value } : null))}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <Label htmlFor="value">Default value ({config?.defaultLocale})</Label>
                  <Input
                    dir="auto"
                    id="value"
                    name="value"
                    value={editing.value}
                    onChange={e => setEditing(prev => (prev != null ? { ...prev, value: e.target.value } : null))}
                    autoComplete="off"
                  />
                </div>
                <Separator />
                {Object.keys(keyTranslations).map(locale => (
                  <div key={locale} className="flex flex-col gap-3">
                    <Label htmlFor={`value-${locale}`}>{locale}</Label>
                    <Input
                      dir="auto"
                      id={`value-${locale}`}
                      name={`value-${locale}`}
                      value={editing.translations[locale]}
                      onChange={e =>
                        setEditing(prev =>
                          prev != null
                            ? {
                                ...prev,
                                translations: { ...prev.translations, [locale]: e.target.value }
                              }
                            : null
                        )
                      }
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={handleSubmit}>Save</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Sub key actions dropdown
 *
 * @param props - component props
 *
 * @returns sub key actions dropdown component
 */
export const SubKeyActions = ({ data }: SubProps) => {
  const { toast } = useToast()
  const { copy } = useClipboard()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <LuMoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation()
              toast({ title: 'Coppied translation' })
              copy(data)
            }}
          >
            Copy translation
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default KeyActions
