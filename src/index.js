import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import registerServiceWorker from './lib/registerServiceWorker'

import './styles/index.css'

// components
import App from './App'
import Profile from './Profile'
import Milestones from './Milestones'
import Milestone from './Milestone'
import Causes from './Causes'
import Cause from './Cause'
import NotFound from './NotFound'
import MainMenu from './MainMenu'

ReactDOM.render(
  <Router>
    <div>
      <MainMenu/>

      <div className="container-fluid">
      
        {/* Routes are defined here */}
        <Switch>
          <Route exact path="/" component={Causes}/>
          <Route exact path="/causes" component={Causes}/>
          <Route exact path="/causes/:id" component={Cause}/>
          <Route exact path="/causes/:id/milestones" component={Milestones}/>
          <Route exact path="/causes/:id/milestones/:id" component={Milestone}/>          
          <Route exact path="/profile" component={Profile}/>
          <Route component={NotFound}/>
        </Switch>
        
      </div>
    </div>
  </Router>
  ,document.getElementById('root')
)

registerServiceWorker()
