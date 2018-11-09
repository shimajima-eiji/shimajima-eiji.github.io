# -*- coding: utf-8 -*-
import smtplib
from email.mime.text import MIMEText
from email.header import Header
from email import charset

con = smtplib.SMTP()
con.connect()
con.set_debuglevel(True)

cset = 'utf-8'  # <---------------(文字セットの設定だよ)
from_addr = 'from@example.com'
to_addr = 'ここをslackに変えるといい感じに運用できる'

message = MIMEText(u'日本語のメールだよ★', 'plain', cset)
message['Subject'] = Header(u'メール送信テスト', cset)
message['From'] = from_addr
message['To'] = to_addr

con.sendmail(from_addr, [to_addr], message.as_string())

con.close()
