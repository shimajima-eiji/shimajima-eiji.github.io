import hug

@hug.get('/send')
def send(mes):
    from server import send
    send.execute(mes)
