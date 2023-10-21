import { AppContext } from '@/components/context/AppContext'
import Svg from '@/components/Svg'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import request from '@lib/functions/request'
import { GetApi, PostApi } from '@lib/interfaces/api/Api'
import { AddNamespace, Namespace } from '@lib/interfaces/api/Namespace'

/**
 * index page
 *
 * @returns page
 */
export default function Page() {
  const { config } = useContext(AppContext)
  const [refresh, refresher] = useState(0)
  const [data, setData] = useState<Namespace[]>([])
  const [newNs, setNewNs] = useState<AddNamespace>({ namespace: '' })
  const { toast } = useToast()

  // add namespace handler
  const handleSubmit: React.MouseEventHandler<HTMLButtonElement> = async e => {
    e.stopPropagation()
    toast({ title: 'Please wait' })
    try {
      const {
        data: { message }
      } = await request<PostApi>('/namespace', { method: 'POST', data: newNs })
      toast({ title: message })
      setNewNs({ namespace: '' })
      refresher(r => ++r)
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    request<GetApi<Namespace[]>>('/namespace', { method: 'GET' })
      .then(({ data: { data } }) => {
        setData(data)
      })
      .catch(error => console.error(error))
  }, [refresh])

  return (
    <>
      <div className="container mt-elem">
        {/* title */}
        <div>
          <h1 className="text-4xl font-bold">Translation Namespaces</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Namespaces (NS) are a feature in internationalization frameworks which allows you to separate translations that
            get loaded into multiple files. read more anout namespaces in{' '}
            <Link
              className="underline underline-offset-4"
              to="https://www.i18next.com/principles/namespaces"
              target="_blank"
            >
              i18next documentation
            </Link>
            .
          </p>
          <p className="mt-3 text-muted-foreground">
            Linguify uses <code className="text-foreground">defaultLocale</code> as source of namespaces and uses it for
            validating and creating new ones.{' '}
            <span className="text-yellow-600">Please avoid interacting with locale folders and namespaces manually</span>.
          </p>
        </div>

        {/* content */}
        <div className="mt-elem grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <div>
            {/* new namespace dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="p-6 w-full h-full">
                  <Svg paths={['M12 4.5v15m7.5-7.5h-15']} />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>New namespace</DialogTitle>
                  <DialogDescription>Create new translation namespace</DialogDescription>
                </DialogHeader>
                <div className="py-4 grid grid-cols-1 gap-8">
                  <Input
                    id="namespace"
                    name="namespace"
                    value={newNs.namespace}
                    onChange={e => setNewNs({ namespace: e.target.value })}
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
          </div>

          {data.map(ns => (
            <Link key={ns} to={`/${ns}`}>
              <Card key={ns}>
                <CardHeader>
                  <CardTitle>{ns.replace('.json', '')}</CardTitle>
                  <CardDescription>
                    {config?.localesPath}/{'{locale}'}/{ns}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
