import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Root from './Root'
import { configureLogger } from './utils/logger'

configureLogger()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root/>
  </React.StrictMode>
)
