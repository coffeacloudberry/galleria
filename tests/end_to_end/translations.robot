*** Settings ***
Documentation    Everything should be translated on the fly, content, tooltips, and modals
Resource         resource.robot

*** Variables ***
${INTERATIONS}    ${2}

*** Keywords ***
Page Should Be Translated
    Page Should Not Contain    @@

*** Test Cases ***
Valid Dynamic Translation Updates And Retention
    Open Browser To Landing Page
    Page Should Be Translated
    Element Should Be Visible        xpath://a[@data-tippy-content="Read the story"]
    Element Should Be Visible        xpath://a[contains(@href, "/about")]//span//strong[text()="About"]
    Switch Language                  Français
    Page Should Be Translated
    Element Should Be Visible        xpath://a[@data-tippy-content="Lire l'aventure"]
    Element Should Be Visible        xpath://a[contains(@href, "/about")]//span//strong[text()="À propos"]
    Switch Language                  Suomi
    Page Should Be Translated
    Element Should Be Visible        xpath://a[@data-tippy-content="Lue tarina"]
    Element Should Be Visible        xpath://a[contains(@href, "/about")]//span//strong[text()="Tietoja"]
    Switch Language                  English
    Page Should Be Translated
    Element Should Be Visible        xpath://a[@data-tippy-content="Read the story"]
    Element Should Be Visible        xpath://a[contains(@href, "/about")]//span//strong[text()="About"]
    Switch Language                  Français
    Page Should Be Translated
    Element Should Be Visible        xpath://a[@data-tippy-content="Lire l'aventure"]
    Element Should Be Visible        xpath://a[contains(@href, "/about")]//span//strong[text()="À propos"]
    Click Link                       partial link:À propos
    Page Should Be Translated
    [Teardown]    Close Browser

Tooltips On Map Controls
    Open Browser To Story With Map
    Large Window
    FOR    ${index}    IN RANGE    ${INTERATIONS}
        Page Should Be Translated
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-fullscreen" and @data-tippy-content="Enter fullscreen"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-zoom-in" and @data-tippy-content="Zoom in"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-compass" and @data-tippy-content="Reset bearing to north"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-my-autopilot" and @data-tippy-content="Play autopilot"]
        Switch Language                  Suomi
        Page Should Be Translated
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-fullscreen" and @data-tippy-content="Siirry koko näyttöön"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-zoom-in" and @data-tippy-content="Suurenna"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-compass" and @data-tippy-content="Nollaa suuntima pohjoiseen"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-my-autopilot" and @data-tippy-content="Toista autopilotti"]
        Switch Language                  Français
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-fullscreen" and @data-tippy-content="Entrer en mode plein écran"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-zoom-in" and @data-tippy-content="Zoomer"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-compass" and @data-tippy-content="Remettre le nord en haut"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-my-autopilot" and @data-tippy-content="Mode pilote automatique"]
        IF  ${index + 1} < ${INTERATIONS}
            Page Should Be Translated
            Switch Language              English
        END
    END
    [Teardown]    Close Browser
