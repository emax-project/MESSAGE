# 메신저 LDAP 연동

씨에스아이엔테크 Synology LDAP Server(OpenLDAP)로 로그인·비밀번호를 맞춘다.  
그룹웨어·ERP와 같은 계정(`uid`)을 쓴다.

## 동작

- `LDAP_ENABLED=true`이면 일반 사용자는 LDAP bind로 인증한다.
- `ADMIN_EMAIL`과 `LDAP_LOCAL_EXCEPTIONS`는 LDAP에 넣지 않고 로컬 비밀번호로 로그인한다 (장애 시 비상 접속).
- 로그인 ID는 `uid`다. `wtkim` 또는 `wtkim@csin.kr` 모두 받는다. 메신저 User는 이메일(`wtkim@csin.kr`)로 찾는다.
- 검색 필터에 `!(shadowExpire=1)`을 넣는다. 비활성 계정은 bind가 되어도 로그인되지 않는다.
- 비밀번호 변경·관리자 초기화는 LDAP `userPassword`에 반영한다. 초기화 시 `pwdReset=TRUE`를 시도한다.
- LDAP가 켜져 있으면 공개 회원가입은 막는다. 계정은 조직 sync / 관리자 일괄 등록으로 만든다.

## 비밀번호 정책 (LDAP ON)

시놀로지 Directory 정책과 같다.

- 최소 12자
- 영문 대문자 + 소문자
- 숫자 1자 이상
- 특수문자 1자 이상

잠금(30분 내 10회 실패 → 30분)은 LDAP가 처리한다.

## 환경 변수

`packages/server/.env.example` 참고. 거래처 기본값:

| 항목 | 값 |
|------|-----|
| URL | `ldaps://ldap.csin.kr:636` |
| Base DN | `dc=ldap,dc=csin,dc=kr` |
| Search Base | `cn=users,dc=ldap,dc=csin,dc=kr` |
| Bind DN | `uid=ldap_gw,cn=users,dc=ldap,dc=csin,dc=kr` |
| 로그인 속성 | `uid` |

사내망 전용이다. 서버 hosts에 `ldap.csin.kr → 192.168.123.247`을 넣고, 인증서 검증을 위해 **IP가 아니라 도메인**으로 접속한다.

## 확인

```bash
cd packages/server
# .env 에 LDAP_* 설정
npm run ldap:check
npm run ldap:check -- --uid wtkim
```

- `GET /health/ldap`
- `GET /auth/password-policy`

거래처 망에 메신저를 올린 뒤 `LDAP_ENABLED=true`와 Bind 비밀번호를 넣는다.  
이맥스 사무실에서는 LDAP에 닿지 않을 수 있다.
