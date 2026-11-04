import { StrictMode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { keepView } from './page'
import { queryClient, TRPCProvider, trpcClient } from './trpc'
import './webview.css'

// the project's folder kept from the start, so a panel that never read its files still comes back after a reload
keepView({})

const root = document.getElementById('root')
if (root === null) throw new Error('The page has no #root element')

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
				<App />
			</TRPCProvider>
		</QueryClientProvider>
	</StrictMode>
)
