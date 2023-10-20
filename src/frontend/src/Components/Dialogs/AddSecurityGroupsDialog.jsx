import React, { useState } from "react";
import { Dialog, Text, TextArea, Button } from "@fluentui/react-northstar";
import _ from 'lodash'


export default function AddSecurityGroupsDialog(props) {
  const [newGroup, setNewGroup] = useState("");
  const [groups, setGroups] = useState([]);

  const onDialogSave = (event) => {
    console.log(event);
    const newOption = props.currentOption;
    newOption.serviceSpecificConfig = {
      groups: groups,
    };
    props.setHideDialog(true);
    props.addItemToPipeline(newOption);
  };

  const onDialogCancel = () => {
    props.setHideDialog(true);
  };

  const onNewGroupChange = (_, value) => {
    setNewGroup(value.value);
  };

  const onAddNewGroup = () => {
    if(groups && newGroup){
      const _groups = _.cloneDeep(groups)
      _groups.push(newGroup)
      setGroups(_groups)
      setNewGroup("")
    }
  }

  const onResetNewGroups = () => {
    if(groups){
      setGroups([])
    }
  }

  const labelStyle = {
    display: "block",
    marginLeft: "10px",
    marginBottom: "15px",
    marginTop: "15px" 
  };

  const renderGroups = () => {
    if(groups){
      return(
        groups.map(group => {
          return(<li>{group}</li>)
        }))
    }
  }

  return (
    <Dialog
      header="Add Security Groups"
      content={
        <>
          <div style={{ display: "flex" }}>
            <div id="image-features-labels">
              <Text content="New Security Group" style={labelStyle} />
              <TextArea value={newGroup} onChange={onNewGroupChange} style={{marginLeft: "10px", lineHeight: "8px"}}/>
              
            </div>
            <div id="image-features-checkboxes" style={{marginLeft : "20px",marginTop:"15px"}}>
              <ul>
                {renderGroups()}
              </ul>
            </div>
          </div>
          <Button style={labelStyle} onClick={onAddNewGroup} primary>Add</Button>
          <Button style={labelStyle} onClick={onResetNewGroups} primary>Reset</Button>
        </>
      }
      open={!props.hideDialog}
      cancelButton="Cancel"
      confirmButton="Submit"
      onConfirm={onDialogSave}
      onCancel={onDialogCancel}
      style={{ overflow: "visible" }}
    />
  );
}
