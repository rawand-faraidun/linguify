import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '@/components/context/AppContext'
import NamespaceActions from '@/components/pages/NamespaceActions'
import NamespaceTable from '@/components/pages/NamespaceTable'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import request from '@lib/functions/request'
import { GetApi } from '@lib/interfaces/api/Api'
import { Namespace } from '@lib/interfaces/api/Namespace'

/**
 * namespace page
 *
 * @returns page
 */
export default function Page() {
  const { ns } = useParams()
  const namespace = (ns || '').replace('.json', '')
  const navigate = useNavigate()
  const { toast } = useToast()
  const { config } = useContext(AppContext)
  const [refresh, refresher] = useState(0)
  const [data, setData] = useState<Namespace>({ namespace: namespace, values: {}, flatten: {}, flattenValues: [] })

  useEffect(() => {
    request<GetApi<Namespace>>(`/namespace/${ns}`, { method: 'GET' })
      .then(({ data: { data } }) => {
        setData(data)
      })
      .catch(error => {
        toast({ title: error.message, variant: 'destructive' })
        navigate('/')
      })
  }, [ns, refresh])

  return (
    <div className="container mt-elem">
      {/* head */}
      <div className="flex justify-between items-center gap-4">
        {/* title */}
        <div>
          <h1 className="text-4xl font-bold">{namespace}</h1>
          <p className="text-muted-foreground">
            {config?.localesPath}/{'{locale}'}/{ns}
          </p>
        </div>

        {/* actions */}
        <div>
          <NamespaceActions
            ns={ns!}
            onUpdate={({ namespace }) => navigate(`/${namespace}`)}
            onDelete={() => navigate(`/`)}
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* datas */}
      <div>
        <NamespaceTable data={data} refresher={() => refresher(r => ++r)} />
      </div>
    </div>
  )
}
