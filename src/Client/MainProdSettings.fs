module rec MainProdSettings

open Elmish
open Fable.React
open Fable.React.Props
open Elmish.React
open Fable.FontAwesome

open Shared
open Common
open MainModels

type Msg =
    | SettingsResp of RESP<SettingsCard>
    | UpdateMixlrCode of string
    | QuizImgChanged of {|Type:string; Body:byte[]; Tag:unit|}
    | QuizImgClear of unit
    | UploadQuizImgResp of RESP<{|BucketKey:string|}>
    | DeleteError of string
    | Submit
    | Exn of exn

type Model = {
    Settings : SettingsCard option
    Errors : Map<string, string>
    IsLoading : bool
}

let addError txt model =
    {model with Errors = model.Errors.Add(System.Guid.NewGuid().ToString(),txt)}

let delError id model =
    {model with Errors = model.Errors.Remove id}

let loading model =
    {model with IsLoading = true}

let editing model =
    {model with IsLoading = false}

let uploadFile (api:IMainApi) respMsg fileType body model =
    if Array.length body > (1024*128) then
        model |> addError "max image size is 128K" |> noCmd
    else
        model |> loading |> apiCmd api.uploadFile {|Cat = Quiz; FileType=fileType; FileBody=body|} respMsg Exn

let settings (f : SettingsCard -> SettingsCard) (model:Model) =
    match model.Settings with
    | Some settings -> {model with Settings = Some (f settings)}
    | None -> model

let init (api:IMainApi) user : Model*Cmd<Msg> =
    {Errors = Map.empty; IsLoading = true; Settings = None} |> apiCmd api.getSettings () SettingsResp Exn

let update (api:IMainApi) user (msg : Msg) (cm : Model) : Model * Cmd<Msg> =
    match msg with
    | SettingsResp {Value = Ok card} -> {cm with Settings = Some card} |> editing |> noCmd
    | UpdateMixlrCode txt -> cm |> settings (fun s -> {s with DefaultMixlr = ofInt <| Some txt}) |> noCmd
    | QuizImgClear _ ->  cm |> settings (fun s -> {s with DefaultImg = ""}) |> noCmd
    | QuizImgChanged res -> cm |> uploadFile api UploadQuizImgResp res.Type res.Body
    | UploadQuizImgResp {Value = Ok res} -> cm |> editing |> settings (fun s -> {s with DefaultImg = res.BucketKey}) |> noCmd
    | Submit -> cm |> loading |> apiCmd api.updateSettings cm.Settings.Value SettingsResp Exn
    | DeleteError id -> cm |> delError id |> noCmd
    | Exn ex -> cm |> addError ex.Message |> editing |> noCmd
    | Err txt -> cm |> addError txt |> editing |> noCmd
    | _ -> cm |> noCmd

let view (dispatch : Msg -> unit) (user:MainUser) (model : Model) =
    div[][
        if model.IsLoading then
            button [Class "button is-loading is-large is-fullwidth is-dark"][]

        MainTemplates.errors dispatch DeleteError model.Errors

        match model.Settings with
        | Some settings ->
            div [Class "has-background-light has-text-dark"; Style [Padding "12px"]][
                div [Class "field"][
                    label [Class "label"][str "User Id"]
                    div [Class "control"][
                        input [Class "input"; Type "text"; ReadOnly true; Value settings.UserId]
                    ]
                ]

                div [Class "columns"][
                    div [Class "column"][
                        div [Class "field"][
                            label [Class "label"][str "Default Mixlr User Id"]
                            div [Class "control"][
                                input [Class "input"; Type "number"; Placeholder ""; MaxLength 128.0;
                                    valueOrDefault settings.DefaultMixlr; ReadOnly model.IsLoading;
                                    OnChange (fun ev -> dispatch <| UpdateMixlrCode ev.Value)]

                            ]
                            small[][
                                str "https://mixlr.com/users/"
                                span [Class "has-text-danger"][str "THISID"]
                                str "/embed from "
                                a[Href "https://mixlr.com/settings/embed/"][str "https://mixlr.com/settings/embed/"]
                            ]
                        ]
                    ]
                    div [Class "column"][
                        div [Class "field"][
                            label [Class "label"][str "Default Quiz Picture (128x128) 128K Size Max"]

                            yield! MainTemplates.imgArea128 () model.IsLoading (QuizImgChanged>>dispatch) (QuizImgClear>>dispatch) settings.DefaultImg "/logo256.png" "Reset to default"
                        ]
                    ]
                ]

                div [Class "field is-grouped"][
                    div [Class "control"][
                        button [Class "button is-dark "; Disabled model.IsLoading; OnClick (fun _ -> dispatch Submit)] [ str "Submit"]
                    ]
                ]

            ]
        | None -> ()

    ]
