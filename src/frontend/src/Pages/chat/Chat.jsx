import { useRef, useState, useEffect } from "react";
import { Panel, DefaultButton, SpinButton } from "@fluentui/react";
//import { SparkleFilled } from "@fluentui/react-icons";
import { Dropdown } from '@fluentui/react-northstar';
import styles from "./Chat.module.css";



import { chatApi } from "./api";
import { Answer, AnswerError, AnswerLoading } from "./components/Answer";
import { QuestionInput } from "./components/QuestionInput";
//import { ExampleList } from "./components/Example";
import { UserChatMessage } from "./components/UserChatMessage";
import { AnalysisPanel, AnalysisPanelTabs } from "./components/AnalysisPanel";
import { SettingsButton } from "./components/SettingsButton";
import { ClearChatButton } from "./components/ClearChatButton";
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
    //const [promptTemplate, setPromptTemplate] = useState("");
    // const [facetTemplate, setFacetTemplate] = useState("If the question is asking about 'sentiment' regarding the sources and other documents in the database, use the 'Facets' field to answer the question.");
    // const [facetQueryTermsTemplate, setFacetQueryTermsTemplate] = useState("When generating the Search Query do not use terms related to sentiment.  Example ['sentiment', 'positive', 'negative',etc]");
    const [retrieveCount, setRetrieveCount] = useState(3);
    //const [useSemanticRanker, setUseSemanticRanker] = useState(true);
    // const [vectorSearchPipeline, setVectorSearchPipeline] = useState("");
    //const [useSemanticCaptions, setUseSemanticCaptions] = useState(false);
    //const [excludeCategory, setExcludeCategory] = useState("");
    //const [useSuggestFollowupQuestions, setUseSuggestFollowupQuestions] = useState(false);

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
    //const [indexSearchDone, setIndexSearchDone] = useState(false)
    // const [pipelines, setPipelines] = useState([])
    const [processType, setProcessType] = useState(processTypes[0].name)



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
                approach: "rtr", //not being used but kept for consistency
                pipeline: generatePipeline(),
                overrides: {
                    //promptTemplate: promptTemplate.length === 0 ? undefined : promptTemplate,
                    //excludeCategory: excludeCategory.length === 0 ? undefined : excludeCategory,
                    top: retrieveCount,
                    //semanticRanker: useSemanticRanker,
                    //vectorSearchPipeline: vectorSearchPipeline,
                    //semanticCaptions: useSemanticCaptions,
                    //suggestFollowupQuestions: useSuggestFollowupQuestions,
                    //facetQueryTermsTemplate: facetQueryTermsTemplate,
                    //facetTemplate : facetTemplate
                },
                index: selectedIndex
            };
            chatApi(request).then(result => {
                setAnswers([...answers, [question, result]]);
                setIsLoading(false);
            })

        } catch (e) {
            setError(e);
        } finally {
            //setIsLoading(false);
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

    return (
        <div className={styles.container}>

            <div className={styles.commandsContainer}>
                <ClearChatButton className={styles.commandButton} onClick={clearChat} disabled={!lastQuestionRef.current || isLoading} />
                <SettingsButton className={styles.commandButton} onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} />
            </div>
            <div className={styles.chatRoot}>

                <div className={styles.chatContainer}>
                    {!lastQuestionRef.current ? (
                        <div className={styles.chatEmptyState}>
                            {/* <SparkleFilled fontSize={"120px"} primaryFill={"rgba(115, 118, 225, 1)"} aria-hidden="true" aria-label="Chat logo" /> */}
                            <h1 className={styles.chatEmptyStateTitle}>Chat with your data</h1>
                            {/* <h2 className={styles.chatEmptyStateSubtitle}>Ask anything or try an example</h2>
                            <ExampleList onExampleClicked={onExampleClicked} /> */}
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
                                        //showFollowupQuestions={useSuggestFollowupQuestions && answers.length - 1 === index}
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
                            placeholder="Type a new question"
                            disabled={isLoading}
                            onSend={question => makeApiRequest(question)}
                        />
                    </div>
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
