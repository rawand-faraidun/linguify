import { useContext, useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import { AppContext } from '../context/AppContext'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import { useToast } from '../ui/use-toast'
import request from '@lib/functions/request'
import { PostApi } from '@lib/interfaces/api/Api'
import { Key } from '@lib/interfaces/api/Key'
import { NS } from '@lib/interfaces/api/Namespace'

/**
 * component props
 */
interface Props {
  namespace: NS
  onSuccess: () => void
}

/**
 * Add Key
 *
 * @param props - component props
 *
 * @returns add key component
 */
const AddKey = ({ namespace, onSuccess }: Props) => {
  const { toast } = useToast()
  const { config } = useContext(AppContext)
  const keyTranslations = config?.otherLocales.reduce((obj, locale) => ({ ...obj, [locale]: '' }), {}) || {}
  const [data, setData] = useState<Key>({ key: '', value: '', translations: keyTranslations })

  // add key handler
  const handleSubmit: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<PostApi>(`/namespace/${namespace}/key`, { method: 'POST', data: data })
      toast({ title: message })
      setData({ key: '', value: '', translations: keyTranslations })
      onSuccess()
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <span>Add key</span>
          <LuPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New key</DialogTitle>
          <DialogDescription>
            Create new translation key <br />
            <span>Note: Default value will be assigned to any empty locale value</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          <div className="grid grid-cols-1 gap-8 py-4 pl-1 pr-3">
            <div className="flex flex-col gap-3">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                name="key"
                value={data.key}
                onChange={e => setData(prev => ({ ...prev, key: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="value">Default value ({config?.defaultLocale})</Label>
              <Input
                dir="auto"
                id="value"
                name="value"
                value={data.value}
                onChange={e => setData(prev => ({ ...prev, value: e.target.value }))}
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
                  value={data.translations[locale]}
                  onChange={e =>
                    setData(prev => ({ ...prev, translations: { ...prev.translations, [locale]: e.target.value } }))
                  }
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button onClick={handleSubmit}>Add</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddKey
