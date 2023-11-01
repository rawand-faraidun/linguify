import { Dispatch, Fragment, SetStateAction, useEffect, useState } from 'react'
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
import Svg from '../Svg'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { useToast } from '../ui/use-toast'
import { cn } from '@lib/functions/cn'
import request from '@lib/functions/request'
import { DeleteApi, PostApi } from '@lib/interfaces/api/Api'
import { Namespace } from '@lib/interfaces/api/Namespace'

/**
 * component props
 */
export interface Props {
  data: Namespace
  refresher: Dispatch<SetStateAction<number>>
}

// sorting type
type sort = {
  key: 'key' | 'value'
  dir: 'asc' | 'desc'
}

/**
 * Namespace data table
 *
 * @param props - component props
 *
 * @returns namespace data table component
 */
const NamespaceTable = ({ data, refresher }: Props) => {
  const { toast } = useToast()
  const [datas, setDatas] = useState(data.flattenValues)
  const [editing, setEditing] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [sort, setSort] = useState<sort>({ key: 'key', dir: 'asc' })
  const [search, setSeatch] = useState('')

  const [newKey, setNewKey] = useState({ key: '', value: '' })

  // add namespace handler
  const handleAddKey: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<PostApi>(`/namespace/${data.namespace}/key`, { method: 'POST', data: newKey })
      toast({ title: message })
      setNewKey({ key: '', value: '' })
      refresher(r => ++r)
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  // update namespace handler
  const handleDelete = async (key?: string) => {
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<DeleteApi>(`/namespace/${data.namespace}/key`, {
        method: 'DELETE',
        data: { keys: key ? [key] : selected }
      })
      toast({ title: message })
      refresher(r => ++r)
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    let ordganizedDatas = data.flattenValues.slice()

    // filtering
    ordganizedDatas = ordganizedDatas.filter(
      ({ key, value, translations }) =>
        key.includes(search) || value.includes(search) || Object.values(translations).some(v => v.includes(search))
    )

    // sorting
    ordganizedDatas.sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : -1))
    if (sort.dir == 'desc') ordganizedDatas.reverse()

    setDatas(ordganizedDatas)
  }, [data, sort, search])

  return (
    <>
      {/* table actions */}
      <div className="flex justify-between items-center">
        <div className="w-full max-w-sm">
          <Input
            className="w-full"
            placeholder="Search key or value"
            value={search}
            onChange={e => setSeatch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* delete all */}
          {selected.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2" variant="destructive">
                  <span>Delete all</span>
                  <Svg
                    paths={[
                      'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0'
                    ]}
                  />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete selected keys</DialogTitle>
                  <DialogDescription>Are you sure to delete selected keys?</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="destructive" onClick={() => handleDelete()}>
                      Delete
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* new key */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <span>Add key</span>
                <Svg paths={['M12 4.5v15m7.5-7.5h-15']} />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New key</DialogTitle>
                <DialogDescription>Create new translation key</DialogDescription>
              </DialogHeader>
              <div className="py-4 grid grid-cols-1 gap-8">
                <div className="flex flex-col gap-3">
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    name="key"
                    value={newKey.key}
                    onChange={e => setNewKey(prev => ({ ...prev, key: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    name="value"
                    value={newKey.value}
                    onChange={e => setNewKey(prev => ({ ...prev, value: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button onClick={handleAddKey}>Add</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* table */}
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            {/* checked and is expanded */}
            <TableHead className="w-[100px]">
              <Checkbox
                checked={datas.every(v => selected.includes(v.key))}
                onCheckedChange={value => (value == true ? setSelected(datas.map(v => v.key)) : setSelected([]))}
              />
            </TableHead>
            {/* key */}
            <TableHead>
              <Button
                className="gap-2"
                variant="ghost"
                onClick={() =>
                  setSort(prev => ({ key: 'key', dir: prev.key == 'key' && prev.dir == 'asc' ? 'desc' : 'asc' }))
                }
              >
                Key
                <div className="flex flex-col">
                  <Svg
                    className={cn('w-3 h-3', { 'text-foreground': sort.key == 'key' && sort.dir == 'desc' })}
                    strokeWidth={3}
                    paths={['M4.5 15.75l7.5-7.5 7.5 7.5']}
                  />
                  <Svg
                    className={cn('w-3 h-3', { 'text-foreground': sort.key == 'key' && sort.dir == 'asc' })}
                    strokeWidth={3}
                    paths={['M19.5 8.25l-7.5 7.5-7.5-7.5']}
                  />
                </div>
              </Button>
            </TableHead>
            {/* value */}
            <TableHead>
              <Button
                className="gap-2"
                variant="ghost"
                onClick={() =>
                  setSort(prev => ({ key: 'value', dir: prev.key == 'value' && prev.dir == 'asc' ? 'desc' : 'asc' }))
                }
              >
                Value
                <div className="flex flex-col">
                  <Svg
                    className={cn('w-3 h-3', { 'text-foreground': sort.key == 'value' && sort.dir == 'desc' })}
                    strokeWidth={3}
                    paths={['M4.5 15.75l7.5-7.5 7.5 7.5']}
                  />
                  <Svg
                    className={cn('w-3 h-3', { 'text-foreground': sort.key == 'value' && sort.dir == 'asc' })}
                    strokeWidth={3}
                    paths={['M19.5 8.25l-7.5 7.5-7.5-7.5']}
                  />
                </div>
              </Button>
            </TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>

        {/* datas */}
        {datas.length > 0 ? (
          <TableBody>
            {datas.map(({ key, value, translations }) => (
              <Fragment key={key}>
                {/* row values */}
                <TableRow
                  data-state={cn(
                    selected.includes(key) ? 'selected' : { expanded: expanded.includes(key) || editing.includes(key) }
                  )}
                >
                  {/* table checked state and expand */}
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      <Checkbox
                        checked={selected.includes(key)}
                        onCheckedChange={value =>
                          setSelected(prev => (value == true ? [...prev, key] : prev.filter(s => s != key)))
                        }
                      />
                      <Button
                        className="p-1"
                        variant="ghost"
                        onClick={() =>
                          setExpanded(prev => (prev.includes(key) ? prev.filter(s => s != key) : [...prev, key]))
                        }
                      >
                        <Svg
                          className="w-4 h-4"
                          strokeWidth={3}
                          paths={[expanded.includes(key) ? 'M19.5 8.25l-7.5 7.5-7.5-7.5' : 'M8.25 4.5l7.5 7.5-7.5 7.5']}
                        />
                      </Button>
                    </div>
                  </TableCell>
                  {/* key */}
                  <TableCell className="text-base">{key}</TableCell>
                  {/* value */}
                  <TableCell dir="auto" className="text-base">
                    {value}
                  </TableCell>
                  {/* actions */}
                  <TableCell></TableCell>
                </TableRow>

                {/* trnaslations */}
                {expanded.includes(key) &&
                  Object.entries(translations).map(([tKey, tValue]) => (
                    <>
                      <TableRow
                        key={`${key}-${tKey}`}
                        className="border-0"
                        data-state={cn({
                          expanded: expanded.includes(key) || editing.includes(key)
                        })}
                      >
                        <TableCell />
                        <TableCell className="border-b">{tKey}</TableCell>
                        <TableCell dir="auto" className="border-b">
                          {tValue}
                        </TableCell>
                        <TableCell className="border-b"></TableCell>
                      </TableRow>
                    </>
                  ))}
              </Fragment>
            ))}
          </TableBody>
        ) : (
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center">
                No result found.
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </Table>
    </>
  )
}

export default NamespaceTable
