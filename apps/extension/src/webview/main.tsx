import { StrictMode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { queryClient, TRPCProvider, trpcClient } from './trpc'
import './webview.css'

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
