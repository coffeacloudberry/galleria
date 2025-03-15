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
    Open Browser    ${LANDING URL}/en/story/Hetta_Pyhakero    ${BROWSER}

Landing Page Should Be Open
    Wait Until Element Is Visible    xpath://div[@class="current-photo"]//img

About Page Should Be Open
    Wait Until Element Is Visible    class:about

Story Page Should Be Open
    Wait Until Element Is Visible    class:story

Wait For Loading Content
    Wait Until Element Is Not Visible   class:loading-icon
    # a toast could hide a link/button required to continue navigating
    Wait Until Element Is Not Visible   class:toastify

Wait For Loading Photo
    Wait For Loading Content
    Landing Page Should Be Open

Over Main Menu
    Mouse Over    id:rf-menu
    Wait Until Element Is Visible    class:menu-item

Go From Content To About Page
    Mouse Out     class:nav-item
    Over Main Menu
    Click Link    partial link:About

Switch Language
    [Arguments]    ${language}
    Mouse Over    id:rf-lang
    Click Link    ${language}
    Mouse Out     id:rf-lang
    Wait Until Element Is Not Visible   link:${language}
