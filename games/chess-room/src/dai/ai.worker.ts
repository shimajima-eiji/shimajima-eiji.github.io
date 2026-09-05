import {chooseDai} from './computer';
self.onmessage=event=>{try{self.postMessage({id:event.data.id,...chooseDai(event.data.state,event.data.model)});}catch{self.postMessage({id:event.data.id,error:true});}};
