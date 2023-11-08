import { useRef, useState, useEffect } from "react";
import { Panel, DefaultButton, SpinButton } from "@fluentui/react";
import { Dropdown, Text, Button } from '@fluentui/react-northstar';
import styles from "./Chat.module.css";

import { pipelineChatApi } from "./api";
import { Answer, AnswerError, AnswerLoading } from "./components/Answer";
import { QuestionInput } from "./components/QuestionInput";
import { UserChatMessage } from "./components/UserChatMessage";
import { AnalysisPanel, AnalysisPanelTabs } from "./components/AnalysisPanel";
import { ClearChatButton } from "./components/ClearChatButton";
import { sc } from '../../Components/serviceCatalog'
import axios from 'axios'


const processTypes = [
    {
        name: "Use Your Own Data (Azure API)",
        agentTypes: [],
        chainTypes: []
    }
]

const EnterpriseSearch = () => {
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [retrieveCount, setRetrieveCount] = useState(3);

    const lastQuestionRef = useRef("");
    const chatMessageStreamEnd = useRef(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [activeCitation, setActiveCitation] = useState(null);
    const [activeAnalysisPanelTab, setActiveAnalysisPanelTab] = useState(undefined);

    const [selectedAnswer, setSelectedAnswer] = useState(0);
    const [answers, setAnswers] = useState([]);

    const [indexes, setIndexes] = useState([])
    const [selectedIndex, setSelectedIndex] = useState(null)
    const [processType, setProcessType] = useState(processTypes[0].name)
    const [chatPipelineText, setChatPipelineText] = useState([])
    const [chatPipeline, setChatPipeline] = useState([])

    const parsePipeline = (pl) => {
        try{
            return pl.split(" -> ")
        } catch(err){

        }
        return []
    }

    useEffect(() => {
        axios.get('/api/indexes').then(_indexes => {
            if (_indexes?.data?.indexes) {
                setIndexes(_indexes.data.indexes)
                setSelectedIndex(_indexes.data.indexes[0])
            }
        }).catch(err => {
            console.log(err)
        })
    }, [])

    const generatePipeline = () => {
        let pipeline = {
            name: "default"
        }

        return pipeline
    }


    const onIndexChange = (_, value) => {
        if (indexes && indexes.length > 0) {
            const _index = indexes.find(i => i.name === value.value)
            setSelectedIndex(_index)
        }

    }

    const onProcessChange = (_, value) => {
        setProcessType(value.value)
    }

    const makeApiRequest = (question => {
        lastQuestionRef.current = question;

        error && setError(undefined);
        setIsLoading(true);
        setActiveCitation(undefined);
        setActiveAnalysisPanelTab(undefined);

        try {
            const history = answers.map(a => ({ user: a[0], assistant: a[1].answer }));
            const request = {
                history: [...history, { user: question, assistant: undefined }],
                approach: "rtr", 
                pipeline: generatePipeline(),
                overrides: {
                    top: retrieveCount,
                },
                index: selectedIndex
            };
            pipelineChatApi(request).then(result => {
                setChatPipelineText(result.answer)
                setChatPipeline(parsePipeline(result.answer))
                setAnswers([...answers, [question, result]]);
                setIsLoading(false);
            })

        } catch (e) {
            setError(e);
        } finally {

        }
    });


    const clearChat = () => {
        lastQuestionRef.current = "";
        error && setError(undefined);
        setActiveCitation(undefined);
        setActiveAnalysisPanelTab(undefined);
        setAnswers([]);
    };

    useEffect(() => chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" }), [isLoading]);

    const onRetrieveCountChange = (_ev, newValue) => {
        setRetrieveCount(parseInt(newValue || "3"));
    };

    const onShowCitation = (citation, index) => {
        if (activeCitation === citation && activeAnalysisPanelTab === AnalysisPanelTabs.CitationTab && selectedAnswer === index) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveCitation(citation);
            setActiveAnalysisPanelTab(AnalysisPanelTabs.CitationTab);
        }

        setSelectedAnswer(index);
    };

    const onToggleTab = (tab, index) => {
        if (activeAnalysisPanelTab === tab && selectedAnswer === index) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveAnalysisPanelTab(tab);
        }

        setSelectedAnswer(index);
    };

    const renderDefaultComponents = () => {
        return (
            <>
                <SpinButton
                    className={styles.chatSettingsSeparator}
                    label="Retrieve this many documents from search:"
                    min={1}
                    max={50}
                    defaultValue={retrieveCount.toString()}
                    onChange={onRetrieveCountChange}
                    style={{ marginBottom: "20px" }}
                />

                <Dropdown
                    placeholder="Select the Process Type"
                    label="Process Type"
                    items={processTypes.map(p => p.name)}
                    onChange={onProcessChange}
                    value={processType}
                    style={{ marginBottom: "20px" }}
                />

                <Dropdown
                    placeholder="Select the Cognitive Search Index"
                    label="Output"
                    items={indexes.map(sc => sc.name)}
                    value={selectedIndex ? selectedIndex.name : ""}
                    onChange={onIndexChange}
                    style={{ marginBottom: "20px" }}
                />
            </>
        )
    }


    const renderComponents = () => {

        return (<>{renderDefaultComponents()}</>)
        
    }

    const createChatPipeline = async () => {
        const pipelinesLabel = "pipelines"
        let currentPipelines = await axios.get(`/api/config?id=${pipelinesLabel}`)
        const stages = []
        let firstStage = {}
        let count = 1
        for(const c in sc){
            if(chatPipeline.includes(sc[c].name)){
                console.log(sc[c].name)
                if(count === 1){
                    firstStage = sc[c]
                } else {
                    stages.push(sc[c])
                }
                count++
            }
        }
        const newPipeline = {
            name : "myDynamicPipeline",
            firstStage : firstStage,
            stages : stages
        }
        
        
        if (currentPipelines.data === '') {
            const newPipelines = { id: 'pipelines', pipelines: [newPipeline]}
            currentPipelines.data = newPipelines
            await axios.post('/api/config', currentPipelines.data)
        } else {
            currentPipelines.data.pipelines.push(newPipeline)
            await axios.post('/api/config', currentPipelines.data)
        }
        console.log(JSON.stringify(chatPipeline))
    }

    // const onCreateCogSearchPipeline = async () => {
    //     console.log(newPipelineName)
    //     let currentPipelines = await axios.get(`/api/config?id=${pipelinesLabel}`)
    //     if (currentPipelines.data === '') {
    //         const newPipelines = { id: 'pipelines', pipelines: [getStage1(newPipelineName),getStage2(newPipelineName),getCogStage3(newPipelineName)]}
    //         currentPipelines.data = newPipelines
    //         await axios.post('/api/config', currentPipelines.data)
    //     } else {
    //         currentPipelines.data.pipelines.push(getStage1(newPipelineName))
    //         currentPipelines.data.pipelines.push(getStage2(newPipelineName))
    //         currentPipelines.data.pipelines.push(getCogStage3(newPipelineName))
    //         await axios.post('/api/config', currentPipelines.data)
    //     }
    //     setPipelines(currentPipelines.data.pipelines)
    //     await axios.get(`/api/cogsearch?pipeline=${newPipelineName}`)
    //     //setSelectedPipeline({ stages: [], name: newPipelineName })
    // }


    const renderButton = () => {
        if(chatPipeline.length > 0){
            return (<Button id="CONFIGURE_PIPELINE" onClick={createChatPipeline} text style={{ color: "rgb(0, 120, 212)", paddingLeft: "0px" }} content={`Create Pipeline: ${chatPipelineText}`} />)
        }
    }

    return (
        <div className={styles.container}>

            <div className={styles.commandsContainer}>
                <ClearChatButton className={styles.commandButton} onClick={clearChat} disabled={!lastQuestionRef.current || isLoading} />
            </div>
            <div className={styles.chatRoot}>

                <div className={styles.chatContainer}>
                    {!lastQuestionRef.current ? (
                        <div className={styles.chatEmptyState}>
                            <Text weight="semibold" style={{ fontSize: "40px", display: "block", marginBottom: "20px" }}>BPA CoPilot</Text>
                        </div>
                    ) : (
                        <div className={styles.chatMessageStream}>
                            {answers.map((answer, index) => (
                                <div key={index}>
                                    <UserChatMessage message={answer[0]} />
                                    <div className={styles.chatMessageGpt}>
                                        <Answer
                                            key={index}
                                            answer={answer[1]}
                                            isSelected={selectedAnswer === index && activeAnalysisPanelTab !== undefined}
                                            onCitationClicked={c => onShowCitation(c, index)}
                                            onThoughtProcessClicked={() => onToggleTab(AnalysisPanelTabs.ThoughtProcessTab, index)}
                                            onSupportingContentClicked={() => onToggleTab(AnalysisPanelTabs.SupportingContentTab, index)}
                                            onFollowupQuestionClicked={q => makeApiRequest(q)}
                                        />
                                        
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerLoading />
                                    </div>
                                </>
                            )}
                            {error ? (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerError error={error.toString()} onRetry={() => makeApiRequest(lastQuestionRef.current)} />
                                    </div>
                                </>
                            ) : null}
                            <div ref={chatMessageStreamEnd} />
                        </div>
                    )}

                    <div className={styles.chatInput}>
                        <QuestionInput
                            clearOnSend
                            placeholder="Describe the document pipeline"
                            disabled={isLoading}
                            onSend={question => makeApiRequest(question)}
                        />
                    </div>
                    {renderButton()}
                </div>

                {answers.length > 0 && activeAnalysisPanelTab && (
                    <AnalysisPanel
                        className={styles.chatAnalysisPanel}
                        activeCitation={activeCitation}
                        onActiveTabChanged={x => onToggleTab(x, selectedAnswer)}
                        citationHeight="810px"
                        answer={answers[selectedAnswer][1]}
                        activeTab={activeAnalysisPanelTab}
                        selectedIndex={selectedIndex}
                    />
                )}

                <Panel
                    headerText="Configure answer generation"
                    isOpen={isConfigPanelOpen}
                    isBlocking={false}
                    onDismiss={() => setIsConfigPanelOpen(false)}
                    closeButtonAriaLabel="Close"
                    onRenderFooterContent={() => <DefaultButton onClick={() => setIsConfigPanelOpen(false)}>Close</DefaultButton>}
                    isFooterAtBottom={true}
                >
                    <div >
                        {renderComponents()}
                        
                    </div>
                </Panel>
            </div>
        </div>
    );
};

export default EnterpriseSearch;
