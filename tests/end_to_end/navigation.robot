*** Settings ***
Documentation    Navigate through the different pages
Resource          resource.robot

*** Test Cases ***
Valid Photo Story About Navigation
    Open Browser To Landing Page
    Landing Page Should Be Open
    Go From Content To About Page
    About Page Should Be Open
    Go From About Page To Content
    Landing Page Should Be Open
    Click Link    xpath://a[@data-tippy-content="Read the story"]
    Story Page Should Be Open
    Go From Content To About Page
    About Page Should Be Open
    Go From About Page To Content
    Story Page Should Be Open
    Click Link    xpath://a[@data-tippy-content="See the photography"]
    Landing Page Should Be Open
    [Teardown]    Close Browser

Valid Browser History
    Open Browser To Landing Page

    Wait For Loading Photo
    ${photo_src_1} =  Get Element Attribute    xpath://div[@id="current-photo"]//img    src
    ${photo_id_1} =  String.Split String From Right    ${photo_src_1}  /    2
    Click Link    xpath://a[@data-tippy-content="Next (keystroke ➡)"]
    Wait For Loading Photo
    ${photo_src_2_4} =  Get Element Attribute    xpath://div[@id="current-photo"]//img    src
    ${photo_id_2_4} =  String.Split String From Right    ${photo_src_2_4}  /    2
    Click Link    xpath://a[@data-tippy-content="Next (keystroke ➡)"]
    Wait For Loading Photo
    ${photo_src_3} =  Get Element Attribute    xpath://div[@id="current-photo"]//img    src
    ${photo_id_3} =  String.Split String From Right    ${photo_src_3}  /    2
    Click Link    xpath://a[@data-tippy-content="Previous (keystroke ⬅)"]
    Wait For Loading Content
    Click Link    xpath://a[@data-tippy-content="Read the story"]
    Wait Until Element Is Visible    id:story
    Go From Content To About Page
    Wait Until Element Is Visible    id:about
    Go From About Page To Content
    Wait Until Element Is Visible    id:story

    Go Back
    Wait Until Element Is Visible    id:about
    Go Back
    Wait Until Element Is Visible    id:story
    Go Back
    Wait For Loading Photo
    ${new_photo_src} =  Get Element Attribute    xpath://div[@id="current-photo"]//img    src
    Should Contain  ${new_photo_src}    ${photo_id_2_4}[1]
    Go Back
    Wait For Loading Photo
    ${new_photo_src} =  Get Element Attribute    xpath://div[@id="current-photo"]//img    src
    Should Contain  ${new_photo_src}    ${photo_id_3}[1]
    Go Back
    Wait For Loading Photo
    ${new_photo_src} =  Get Element Attribute    xpath://div[@id="current-photo"]//img    src
    Should Contain  ${new_photo_src}    ${photo_id_2_4}[1]
    Go Back
    Wait For Loading Photo
    ${new_photo_src} =  Get Element Attribute    xpath://div[@id="current-photo"]//img    src
    Should Contain  ${new_photo_src}    ${photo_id_1}[1]

    [Teardown]    Close Browser
