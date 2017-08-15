import React, { Component } from 'react'
import { Form, Input, File, Select } from 'formsy-react-components';
import { socket } from '../../lib/feathersClient'
import Loader from '../Loader'
import QuillFormsy from '../QuillFormsy'
import Milestone from '../Milestone'
import EditMilestone from '../EditMilestone'


/**
 * Create or edit a campaign
 *
 *  @props
 *    isNew (bool):  
 *      If set, component will load an empty model.
 *      If not set, component expects an id param and will load a campaign object from backend
 *    
 *  @params
 *    id (string): an id of a campaign object
 */

class EditCampaign extends Component {
  constructor() {
    super()

    // TO DO: perhaps move all models to seperate files.
    this.milestone = {
      title: 'milestone',
      description: 'some milestone',
      image: '',
      ownerAddress: null,
      reviewerAddress: null,
      recipientAddress: null,
      donationsReceived: 0,
      donationsGiven: 0,
      completionDeadline: new Date(),
      completionStatus: 'pending'
    }

    this.state = {
      isLoading: true,
      isSaving: false,
      title: '',
      description: '',
      image: '',
      videoUrl: '',
      ownerAddress: null,
      milestones: [],
      causes: [],
      causesOptions: [],
      hasError: false
    }

    this.submit = this.submit.bind(this)
  } 


  componentDidMount() {
    Promise.all([
      // load a single campaigns (when editing)
      new Promise((resolve, reject) => {
        if(!this.props.isNew) {
          socket.emit('campaigns::find', {_id: this.props.match.params.id}, (error, resp) => {   
            console.log(resp) 
            if(resp) {  
              this.setState({
                id: this.props.match.params.id,
                title: resp.data[0].title,
                description: resp.data[0].description,
                image: resp.data[0].image,
                videoUrl: resp.data[0].videoUrl,
                ownerAddress: resp.data[0].ownerAddress,
                milestones: resp.data[0].milestones,        
                causes: resp.data[0].causes  
              }, resolve())  
            } else {
              reject()
            }
          })  
        } else {
          resolve()
        }
      })
    ,
      // load all causes. 
      // TO DO: this needs to be replaced by something like http://react-autosuggest.js.org/
      new Promise((resolve, reject) => {
        socket.emit('causes::find', { $select: [ 'title', '_id' ] }, (err, resp) => {    
          if(resp){
            this.setState({ 
              causesOptions: resp.data.map((c) =>  { return { label: c.title, value: c._id } }),
              hasError: false
            }, resolve())
          } else {
            this.setState({ hasError: true }, reject())
          }
        })
      })

    ]).then(() => this.setState({ isLoading: false, hasError: false }), this.focusFirstInput())
      .catch((e) => {
        console.log('error loading', e)
        this.setState({ isLoading: false, hasError: true })        
      })
  }

  focusFirstInput(){
    setTimeout(() => this.refs.title.element.focus(), 500)
  }

  mapInputs(inputs) {
    return {
      'title': inputs.title,
      'description': inputs.description,
      'causes': inputs.causes
    }
  }  

  loadAndPreviewImage() {
    const reader = new FileReader()  

    reader.onload = (e) => this.setState({ image: e.target.result })

    reader.readAsDataURL(this.refs.imagePreview.element.files[0])
  }

  isValid() {
    return true
    return this.state.description.length > 0 && this.state.title.length > 10 && this.state.image.length > 0
  }

  submit(model) {    
    const constructedModel = {
      title: model.title,
      description: model.description,
      image: this.state.image,
      causes: [ model.causes ]
    }

    const afterEmit = () => {
      this.setState({ isSaving: false })
      this.props.history.push('/campaigns')      
    }

    this.setState({ isSaving: true })

    if(this.props.isNew){
      socket.emit('campaigns::create', constructedModel, afterEmit)
    } else {
      socket.emit('campaigns::update', this.state.id, constructedModel, afterEmit)
    }
  } 

  addMilestone(){
    let milestones = this.state.milestones
    milestones.push(this.milestone)
    console.log('milestones', milestones)
    this.setState({ milestones: milestones }) 
  }

  removeMilestone(milestone){
    this.setState({ milestones: this.state.milestones.filter((m) => {
        return m !== milestone
      })
    })
  }

  goBack(){
    this.props.history.push('/campaigns')
  }

  render(){
    const { isNew } = this.props
    let { isLoading, isSaving, title, description, image, causes, causesOptions, milestones } = this.state

    return(
        <div id="edit-campaign-view">
          <div className="container-fluid page-layout">
            <div className="row">
              <div className="col-md-8 m-auto">
                { isLoading && 
                  <Loader className="fixed"/>
                }
                
                { !isLoading &&
                  <div>
                    { isNew &&
                      <h1>Start a new campaign!</h1>
                    }

                    { !isNew &&
                      <h1>Edit campaign {title}</h1>
                    }

                    <Form onSubmit={this.submit} mapping={this.mapInputs} layout='vertical'>
                      <div className="form-group">
                        <Input
                          name="title"
                          id="title-input"
                          label="Title"
                          ref="title"
                          type="text"
                          value={title}
                          placeholder="E.g. Climate change."
                          help="Describe your cause in 1 scentence."
                          validations="minLength:10"
                          validationErrors={{
                              minLength: 'Please provide at least 10 characters.'
                          }}                    
                          required
                        />
                      </div>

                      <div className="form-group">
                        <QuillFormsy 
                          name="description"
                          label="Description"
                          value={description}
                          placeholder="Describe your campaign..."
                          validations="minLength:10"  
                          help="Describe your campaign."   
                          validationErrors={{
                              minLength: 'Please provide at least 10 characters.'
                          }}                    
                          required                                        
                        />
                      </div>

                      <div id="image-preview">
                        <img src={image} width="500px" alt=""/>
                      </div>

                      <div className="form-group">
                        <label>Add a picture</label>
                        <File
                          name="picture"
                          onChange={()=>this.loadAndPreviewImage()}
                          ref="imagePreview"
                          required
                        />
                      </div>

                      {/* TO DO: This needs to be replaced by something like http://react-autosuggest.js.org/ */}
                      <div className="form-group">
                        <Select
                          name="causes"
                          label="Which cause does this campaign solve?"
                          options={causesOptions}
                          value={causes[0]}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Milestones</label>
                        <div className="row">
                          <div className="col-md-12">

                            { isNew &&
                              <div id="accordion" role="tablist">
                                {milestones.length > 0 && milestones.map((m, i) => 
                                  <EditMilestone model={m} isNew={true} removeMilestone={()=>this.removeMilestone(m)} key={i} />
                                )}                              
                              </div>
                            }
                            
                            { !isNew && 
                              <div id="accordion" role="tablist">
                                {milestones.length > 0 && milestones.map((m, i) => 
                                  <Milestone model={m} removeMilestone={()=>this.removeMilestone(m)} key={i} />
                                )}
                              </div>
                            }
                          </div>                            
                        </div>

                        <div className="card card-outline">
                          <a className="btn btn-primary btn-sm" onClick={()=>this.addMilestone()}>Add milestone</a>
                        </div>
                      </div>

                      <button className="btn btn-success" formNoValidate={true} type="submit" disabled={isSaving || !this.isValid()}>
                        {isSaving ? "Saving..." : "Save campaign"}
                      </button>
                                     
                    </Form>
                  </div>
                }

              </div>
            </div>
          </div>
      </div>
    )
  }
}

export default EditCampaign