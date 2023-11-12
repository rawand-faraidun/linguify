import { Dispatch, Fragment, SetStateAction, useEffect, useState } from 'react'
import Svg from '../Svg'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { useToast } from '../ui/use-toast'
import AddKey from './AddKey'
import KeyActions, { SubKeyActions } from './KeyActions'
import { cn } from '@lib/functions/cn'
import request from '@lib/functions/request'
import { DeleteApi } from '@lib/interfaces/api/Api'
import { EditKey } from '@lib/interfaces/api/Key'
import { Namespace } from '@lib/interfaces/api/Namespace'

/**
 * component props
 */
export interface Props {
  data: Namespace
  refresher: Dispatch<SetStateAction<number>>
}

// sorting type
type sort = { key: 'key' | 'value'; dir: 'asc' | 'desc' }

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
  const [selected, setSelected] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const editingState = useState<EditKey | null>(null)
  const [sort, setSort] = useState<sort>({ key: 'key', dir: 'asc' })
  const [search, setSeatch] = useState('')

  // delete key handler
  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<DeleteApi>(`/namespace/${data.namespace}/key`, { method: 'DELETE', data: { keys: selected } })
      toast({ title: message })
      setSelected([])
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
        key.includes(search) ||
        value.includes(search) ||
        // expanding the row if the translation matches the search
        Object.values(translations).some(v => {
          if (v.includes(search)) setExpanded(prev => [...prev, key])
          return v.includes(search)
        })
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
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* new key */}
          <AddKey namespace={data.namespace} onSuccess={() => refresher(r => ++r)} />
        </div>
      </div>

      {/* table */}
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            {/* selected and is expanded */}
            <TableHead className="w-[1px]">
              <div className="flex gap-2 items-center">
                <Checkbox
                  checked={datas.every(v => selected.includes(v.key))}
                  onCheckedChange={value => (value == true ? setSelected(datas.map(v => v.key)) : setSelected([]))}
                />
                {datas.some(v => expanded.includes(v.key)) && (
                  <Button className="p-1" variant="ghost" onClick={() => setExpanded([])}>
                    <Svg className="w-4 h-4 text-foreground" paths={['M19.5 8.25l-7.5 7.5-7.5-7.5']} />
                  </Button>
                )}
              </div>
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
            <TableHead className="w-[1px]" />
          </TableRow>
        </TableHeader>

        {/* datas */}
        {datas.length > 0 ? (
          <TableBody>
            {datas.map(row => {
              const { key, value, translations } = row
              const isSelected = selected.includes(key)
              const isExpanded = expanded.includes(key)

              return (
                <Fragment key={key}>
                  {/* row values */}
                  <TableRow data-state={cn(isSelected ? 'selected' : { expanded: isExpanded })}>
                    {/* table checked state and expand */}
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={value =>
                            setSelected(prev => (value == true ? [...prev, key] : prev.filter(s => s != key)))
                          }
                        />
                        <Button
                          className="p-1"
                          variant="ghost"
                          onClick={() =>
                            setExpanded(prev => (prev.includes(key) ? prev.filter(e => e != key) : [...prev, key]))
                          }
                        >
                          <Svg
                            className="w-4 h-4"
                            paths={[isExpanded ? 'M19.5 8.25l-7.5 7.5-7.5-7.5' : 'M8.25 4.5l7.5 7.5-7.5 7.5']}
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
                    <TableCell>
                      <KeyActions
                        namespace={data.namespace}
                        data={row}
                        editingState={editingState}
                        setSelected={setSelected}
                        onSuccess={() => refresher(r => ++r)}
                      />
                    </TableCell>
                  </TableRow>

                  {/* trnaslations */}
                  {isExpanded &&
                    Object.entries(translations).map(([tKey, tValue]) => (
                      <Fragment key={`${key}-${tKey}`}>
                        <TableRow className="border-0" data-state={cn({ expanded: isExpanded })}>
                          <TableCell />
                          {/* locale */}
                          <TableCell className="border-b">{tKey}</TableCell>
                          {/* value */}
                          <TableCell dir="auto" className="border-b">
                            {tValue}
                          </TableCell>
                          {/* actions */}
                          <TableCell className="border-b">
                            <SubKeyActions data={tValue} />
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    ))}
                </Fragment>
              )
            })}
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
