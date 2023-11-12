import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AddNamespace from '@/components/sections/AddNamespace'
import NamespaceCard from '@/components/sections/NamespaceCard'
import { useToast } from '@/components/ui/use-toast'
import request from '@lib/functions/request'
import { GetApi } from '@lib/interfaces/api/Api'
import { NS } from '@lib/interfaces/api/Namespace'

/**
 * index page
 *
 * @returns page
 */
export default function Page() {
  const { toast } = useToast()
  const [refresh, refresher] = useState(0)
  const [data, setData] = useState<NS[]>([])

  useEffect(() => {
    request<GetApi<NS[]>>('/namespace', { method: 'GET' })
      .then(({ data: { data } }) => {
        setData(data)
      })
      .catch(error => toast({ title: error.message }))
  }, [refresh])

  return (
    <>
      <div className="container mt-elem">
        {/* title */}
        <div>
          <h1 className="text-4xl font-bold">Translation Namespaces</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Namespaces (NS) are a feature in internationalization frameworks which allows you to separate translations that
            get loaded into multiple files. read more about namespaces in{' '}
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
            {/* add namespace dialog */}
            <AddNamespace onSuccess={() => refresher(r => ++r)} />
          </div>

          {/* namespaces */}
          {data.map(ns => (
            <NamespaceCard key={ns} ns={ns} onUpdate={() => refresher(r => ++r)} onDelete={() => refresher(r => ++r)} />
          ))}
        </div>
      </div>
    </>
  )
}
