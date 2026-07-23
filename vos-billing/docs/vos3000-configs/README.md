# VOS3000 Configuration Files Reference

Reference copies of the VOS3000 / Apache Tomcat configuration files from `base/apache-tomcat/conf/`.

**Server:** 51.161.47.101  
**VOS3000 version:** 2.1.8.5  
**Sensitive values (passwords, keys) have been redacted.**

---

## Files

### VOS3000-Specific

| File | Lines | Purpose |
|------|-------|---------|
| `webserver.conf` | 15 | Main webserver configuration |
| `webserver_parameter.conf` | 5 | Database connection parameters (VOS_DB_HOST, VOS_DB_USER, etc.) |
| `webserver_access_control.conf` | 0 | IP access control rules |

### Apache Tomcat

| File | Lines | Purpose |
|------|-------|---------|
| `server.xml` | 176 | Tomcat server configuration (ports, connectors, SSL) |
| `web.xml` | 4220 | Default web application deployment descriptor |
| `context.xml` | 34 | Global context configuration |
| `tomcat-users.xml` | 44 | Tomcat user authentication |
| `catalina.properties` | 195 | Tomcat classloader and security properties |
| `logging.properties` | 69 | Java Util Logging configuration |

---

## Key Parameters

### Database Connection (from webserver_parameter.conf)

```
VOS_DB_HOST=127.0.0.1
VOS_DB_PORT=3306
VOS_DB_USER=root
VOS_DB_PASSWORD=***REDACTED***
VOS_DB_NAME=vos3000
```

### Tomcat Ports (from server.xml)

| Connector | Port | Protocol |
|-----------|------|----------|
| HTTP | 8080 | HTTP/1.1 |
| AJP | 8009 | AJP/1.3 |

### ACCESS_UUID (from vos3000/etc/server.conf)

```
ACCESS_UUID=55000fed-2b31-40f9-bce6-fd8bf6225c2d
```

---

## Usage

These files are provided as reference for:
- New VOS3000 installations
- Troubleshooting configuration issues
- Understanding VOS3000 architecture
- Disaster recovery documentation

**Do not use these files directly** — they contain server-specific paths and may need adjustment for other installations.
