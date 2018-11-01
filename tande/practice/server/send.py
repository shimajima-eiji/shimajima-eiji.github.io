import requests, json

def sebd_slack(WEB_HOOK_URL, message):
  requests.post(
    WEB_HOOK_URL, data = json.dumps({
      'text': 'user action :{}'.format(message),
      'username': u'group_emerg',
    })
  )
