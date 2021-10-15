*** Settings ***
Documentation     A resource file with reusable keywords and variables.
Library           SeleniumLibrary
Library           String

*** Variables ***
${SERVER}         localhost:8080
${BROWSER}        Firefox
${DELAY}          0
${LANDING URL}    http://${SERVER}/

*** Keywords ***
Small Window
    Set Window Position    0       0
    Set Window Size        800     600

Large Window
    Set Window Position    0       0
    Set Window Size        1401    800

Open Browser To Landing Page
    Open Browser    ${LANDING URL}    ${BROWSER}
    Large Window
    Set Selenium Speed    ${DELAY}
    Landing Page Should Be Open

Open Browser To Story With Map
    Open Browser    ${LANDING URL}/#!/en/story/Hetta_Pyhakero    ${BROWSER}

Landing Page Should Be Open
    Wait Until Element Is Visible    id:current-image-element

About Page Should Be Open
    Wait Until Element Is Visible    id:about

Story Page Should Be Open
    Wait Until Element Is Visible    id:story

Wait For Loading Content
    Wait Until Element Is Not Visible   class:loading-icon

Go From About Page To Content
    Click Link    xpath://a[@data-tippy-content="Back to the photography or story"]

Go From Content To About Page
    Click Link    partial link:About

Switch Language
    [Arguments]    ${language}
    Mouse Over    id:language-selection
    Click Link    ${language}
    Mouse Out     id:language-selection
    Wait Until Element Is Not Visible   link:${language}
