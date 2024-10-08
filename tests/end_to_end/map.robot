*** Settings ***
Documentation    Interactive Map Interface
Resource          resource.robot

*** Variables ***
${ZOOMIN}               xpath://button[@class="mapboxgl-ctrl-zoom-in"]
${ZOOMOUT}              xpath://button[@class="mapboxgl-ctrl-zoom-out"]
${COMPASS}              xpath://button[@class="mapboxgl-ctrl-compass"]
${PLAY}                 xpath://button[@class="mapboxgl-ctrl-my-autopilot" and @data-tippy-content="Play autopilot"]
${PAUSE}                xpath://button[@class="mapboxgl-ctrl-my-autopilot" and @data-tippy-content="Pause autopilot"]
${REWIND}               xpath://button[@class="mapboxgl-ctrl-my-autopilot" and @data-tippy-content="Back to the starting point"]
${TOOLTIPSTATISTICS}    xpath://div[@class="tippy-content"]//strong[text()="Statistics:"]
${TOOLTIPPROFILE}       xpath://div[@class="tippy-content"]//div[@class="chart-container"]

*** Test Cases ***
Standard And Custom Controls
    Open Browser To Story With Map
    Large Window

    # wait for the slowest control, the autopilot
    Wait Until Element Is Visible    ${PLAY}

    Element Should Be Enabled        ${ZOOMIN}
    Element Should Be Enabled        ${ZOOMOUT}
    Element Should Be Enabled        ${COMPASS}
    Click Button                     ${PLAY}
    Wait Until Element Is Visible    ${PAUSE}
    Element Should Be Disabled       ${ZOOMIN}
    Element Should Be Disabled       ${ZOOMOUT}
    Element Should Be Disabled       ${COMPASS}
    Sleep                            5s
    Click Button                     ${PAUSE}
    Click Button                     ${REWIND}
    Element Should Not Be Visible    ${REWIND}

    [Teardown]    Close Browser
