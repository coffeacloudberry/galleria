*** Settings ***
Documentation    Everything should be translated on the fly, content, tooltips, and modals
Resource          resource.robot

*** Variables ***
${INTERATIONS}    ${2}

*** Test Cases ***
Valid Dynamic Translation Updates And Retention
    Open Browser To Landing Page
    Element Should Be Visible    xpath://a[@data-tippy-content="Read the story"]
    Element Should Be Visible    xpath://a[contains(@href, "/about")]//span[text()="About"]
    Switch Language              Français
    Element Should Be Visible    xpath://a[@data-tippy-content="Lire l'aventure"]
    Element Should Be Visible    xpath://a[contains(@href, "/about")]//span[text()="À propos"]
    Switch Language              Suomi
    Element Should Be Visible    xpath://a[@data-tippy-content="Lue tarina"]
    Element Should Be Visible    xpath://a[contains(@href, "/about")]//span[text()="Tietoja"]
    Switch Language              English
    Element Should Be Visible    xpath://a[@data-tippy-content="Read the story"]
    Element Should Be Visible    xpath://a[contains(@href, "/about")]//span[text()="About"]
    Switch Language              Français
    Element Should Be Visible    xpath://a[@data-tippy-content="Lire l'aventure"]
    Element Should Be Visible    xpath://a[contains(@href, "/about")]//span[text()="À propos"]
    Click Link                   partial link:À propos
    Element Should Be Visible    xpath://h1[text()="À propos de moi"]
    Click Link                   Lire la politique de confidentialité
    Element Should Be Visible    xpath://h1[@class="modal-title" and text()="La vie privée compte"]
    Click Button                 xpath://button[@class="modal-close" and contains(text(), "Fermer")]
    Switch Language              English
    Element Should Be Visible    xpath://h1[text()="About Me"]
    Click Link                   Read the Privacy Policy
    Element Should Be Visible    xpath://h1[@class="modal-title" and text()="Privacy Matters"]
    Click Button                 xpath://button[@class="modal-close" and contains(text(), "Close")]
    Switch Language              Français
    Click Link                   xpath://a[@data-tippy-content="revenir à la photographie ou à l'aventure"]
    Element Should Be Visible    xpath://a[@data-tippy-content="Lire l'aventure"]
    Element Should Be Visible    xpath://a[contains(@href, "/about")]//span[text()="À propos"]
    [Teardown]    Close Browser

Tooltips On Map Controls
    Open Browser To Story With Map
    Large Window
    FOR    ${index}    IN RANGE    ${INTERATIONS}
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-fullscreen" and @data-tippy-content="Enter fullscreen"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-zoom-in" and @data-tippy-content="Zoom in"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-compass" and @data-tippy-content="Reset bearing to north"]
        Wait Until Element Is Visible    xpath://button[@class="mapboxgl-ctrl-my-autopilot" and @data-tippy-content="Play autopilot"]
        Switch Language                  Suomi
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
            Switch Language              English
        END
    END
    [Teardown]    Close Browser
