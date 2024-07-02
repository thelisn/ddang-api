# ddang-api

## 🔖 ERD
![AE1DD1D2-3D4D-4645-B474-5155B58861ED](https://github.com/thelisn/ddang-api/assets/84770467/ddf72830-d33e-4b16-ac88-30ad5a97c991)


##
T = table
C = column

team(T) 생성 후 ID(C) 값에 따라 user(T)에 teamId(C)와 연결되어 대기방에서 팀에 따라 사용자가 나눠지게 됩니다.

user(T) 생성시 관리자에게는 isAdmin(C) true를 생성 시에 설정 해줍니다.

question(T) 생성 후 correctAnswer(C)에 해당하는 문제의 객관식 답을 넣습니다.

answer(T) 생성 후 questionId(C)에는 해당하는 question(T)에 number(C)를 넣습니다.

answer(T)의 number(C)에는 객관식 선택 번호를 순차적으로 기입 합니다.

question_status(T)는 생성 후 관리자가 퀴즈 종료 후 questionId(C)에는 종료된 퀴즈 number(C), totalUserCount(C) 총 참여자 수, correntUserCount(C) 퀴즈 참여자 수, deletedAt(C) 현재 문제 진행 상태 데이터 값이 자동 INSERT 됩니다.

관리자가 퀴즈 시작 후 사용자가 답을 선택하면 user_answer(T)에 questionId(C)에는 진행중인 퀴즈 number(C) 사용자가 선택한 answer(T)의 number(C)에 해당하는 객관식 선택번호, user(T)에 einumber(C) 사번 데이터 값이 자동 INSERT 됩니다.

user_alive(T) 에서는 퀴즈 정답 공개 후 틀린 답을 선택한 경우 userId(C)에는 user(T)에 userId(C), deletedAt(C)에는 "dead", einumber(C)에는 user(T)에 einumber(C) 사번 데이터 값이 자동 INSERT 됩니다.










