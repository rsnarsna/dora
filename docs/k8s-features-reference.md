# ☸️ Kubernetes (K8s) Complete Features & Architecture Guide

> **Core Philosophy Reference**: *"The application should assist our thinking, not replace our thinking."*  
> This documentation acts as an intellectual cognitive exoskeleton and situational clarity reference for all Kubernetes concepts modeled within the **3D Architecture Studio** (`/dashboard/k8s-draw`) and the **Knowledge Universe** (`/dashboard/knowledge`).

---

## 🗺️ Architectural Relationship Overview

```text
               [ Internet / External Traffic ]
                              │
                              ▼
                     [ Ingress Controller ]
                              │ (Routes by host / path)
                              ▼
                      [ Service (ClusterIP) ]
                              │ (Selects labels)
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
      [ Pod Replica 1 ]                   [ Pod Replica 2 ]
      ├── Container (App)                 ├── Container (App)
      ├── Mounts ConfigMap / Secret       ├── Mounts ConfigMap / Secret
      └── Mounts PVC (Persistent Volume)  └── Mounts PVC (Persistent Volume)
```

---

## 1. Workloads & Controllers

---

### 1.1 Pod (`po`)
* **What it is**: The smallest deployable unit in Kubernetes. A wrapper around one or more tightly coupled containers sharing network (IP) and storage.
* **Why use it**: You almost never run bare Pods in production; controllers (Deployments, StatefulSets) manage them.
* **Visual in 3D Canvas**: Hexagonal / Capsule node (Color: `#326CE5`).

#### Simple YAML Spec
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-frontend
  labels:
    app: web
spec:
  containers:
    - name: nginx
      image: nginx:1.25-alpine
      ports:
        - containerPort: 80
```

#### Detailed Output (`kubectl get pod -o wide`)
```text
NAME           READY   STATUS    RESTARTS   AGE   IP            NODE          NOMINATED NODE   READINESS GATES
web-frontend   1/1     Running   0          5m    10.244.1.42   worker-node-1 <none>           <none>
```

#### Key Relationships
* **Managed by**: Deployment, ReplicaSet, StatefulSet, DaemonSet, Job.
* **Consumes**: ConfigMap, Secret, PersistentVolumeClaim.
* **Exposed by**: Service.

---

### 1.2 Deployment (`deploy`)
* **What it is**: A declarative manager for stateless workloads. Manages rolling updates, rollbacks, and self-healing.
* **Why use it**: Standard choice for web apps, APIs, microservices where any instance can handle any request.
* **Visual in 3D Canvas**: Orange Box (`#f97316`).

#### Simple YAML Spec
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth
  template:
    metadata:
      labels:
        app: auth
    spec:
      containers:
        - name: auth
          image: myorg/auth:v2.1
          ports:
            - containerPort: 8080
```

#### Detailed Output (`kubectl describe deployment auth-service`)
```text
Name:                   auth-service
Namespace:              default
CreationTimestamp:      Fri, 04 Sep 2026 12:00:00 +0000
Labels:                 app=auth
Replicas:               3 desired | 3 updated | 3 total | 3 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=auth
  Containers:
   auth:
    Image:      myorg/auth:v2.1
    Port:       8080/TCP
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
```

---

### 1.3 ReplicaSet (`rs`)
* **What it is**: Ensures a specified number of identical pod replicas are running at any given moment.
* **Why use it**: Created and controlled automatically by Deployments. Rarely manipulated directly.
* **Visual in 3D Canvas**: Stepped Box (`#f59e0b`).

#### Detailed Output (`kubectl get rs`)
```text
NAME                      DESIRED   CURRENT   READY   AGE
auth-service-7d48b849b7   3         3         3       12m
```

---

### 1.4 StatefulSet (`sts`)
* **What it is**: Manages stateful applications requiring persistent identity, stable network hostnames, and ordered deployment/scaling.
* **Why use it**: Databases (Postgres, MongoDB, Redis clusters), Kafka, ZooKeeper, Elasticsearch.
* **Visual in 3D Canvas**: Deep Blue Heavy Block (`#1e40af`).

#### Simple YAML Spec
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
spec:
  serviceName: "postgres"
  replicas: 2
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
```

#### Detailed Output (`kubectl get pods -l app=postgres`)
```text
NAME                 READY   STATUS    RESTARTS   AGE   IP            NODE
postgres-cluster-0   1/1     Running   0          40m   10.244.2.11   worker-node-2
postgres-cluster-1   1/1     Running   0          38m   10.244.1.89   worker-node-1
```
*(Notice deterministic, zero-indexed names: `-0`, `-1`)*

---

### 1.5 DaemonSet (`ds`)
* **What it is**: Ensures that all (or some) Nodes run exactly one copy of a Pod. When nodes join the cluster, Pods are automatically added.
* **Why use it**: Log shippers (Fluentbit), monitoring agents (Prometheus node-exporter), cluster networking (Calico, Cilium).
* **Visual in 3D Canvas**: Wide Purple Base Plate (`#7c3aed`).

#### Detailed Output (`kubectl get ds -n kube-system`)
```text
NAME         DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
kube-proxy   3         3         3       3            3           <none>          15d
node-agent   3         3         3       3            3           <none>          15d
```

---

### 1.6 Job (`job`) & CronJob (`cj`)
* **What it is**:
  * **Job**: Runs pods to completion (batch processing, migrations, backups).
  * **CronJob**: Runs jobs on a time-based schedule (like crontab).
* **Visual in 3D Canvas**: Hourglass / Checkbox Node (`#059669`).

#### Simple YAML Spec (CronJob)
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-nightly-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: backup-tool:v1
          restartPolicy: OnFailure
```

#### Detailed Output (`kubectl get cronjob`)
```text
NAME                SCHEDULE    SUSPEND   ACTIVE   LAST SCHEDULE   AGE
db-nightly-backup   0 2 * * *   False     0        18h ago         4d
```

---

## 2. Networking, Discovery & Routing

---

### 2.1 Service (`svc`)
* **What it is**: An abstract way to expose an application running on a set of Pods with a stable virtual IP (ClusterIP) and DNS name.
* **Service Types**:
  1. `ClusterIP` (Default): Internal only, accessible within the cluster.
  2. `NodePort`: Exposes port on every Node's physical IP (`30000-32767`).
  3. `LoadBalancer`: Provisions an external cloud load balancer (AWS NLB, GCP LB).
  4. `ExternalName`: CNAME redirect to an external DNS hostname.
* **Visual in 3D Canvas**: Cyan Router Cube (`#06b6d4`).

#### Simple YAML Spec
```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-api
spec:
  type: ClusterIP
  selector:
    app: orders
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
```

#### Detailed Output (`kubectl get svc`)
```text
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   10.96.0.1        <none>        443/TCP        20d
order-api    ClusterIP   10.105.184.212   <none>        80/TCP         3d
web-lb       LoadBalancer 10.108.92.14    35.202.12.8   80:31200/TCP   3d
```

---

### 2.2 Ingress (`ing`)
* **What it is**: Manages external HTTP/HTTPS access to services within the cluster, offering host/path routing and TLS termination.
* **Why use it**: Single external entry point for dozens of microservices without paying for multiple cloud LoadBalancers.
* **Visual in 3D Canvas**: Green Gateway Arch (`#10b981`).

#### Simple YAML Spec
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-api
                port:
                  number: 80
```

#### Detailed Output (`kubectl get ingress`)
```text
NAME           CLASS   HOSTS             ADDRESS          PORTS     AGE
main-ingress   nginx   api.example.com   34.120.105.50    80, 443   10d
```

---

### 2.3 NetworkPolicy (`netpol`)
* **What it is**: Firewall rules for Pod-to-Pod traffic based on IP blocks and labels. By default, Pods accept traffic from anywhere.
* **Why use it**: Zero-trust security; isolate databases so only backend pods can connect.
* **Visual in 3D Canvas**: Red Security Shield (`#ef4444`).

#### Simple YAML Spec
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-allow-backend-only
spec:
  podSelector:
    matchLabels:
      app: postgres
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 5432
```

---

## 3. Configuration & Persistent Storage

---

### 3.1 ConfigMap (`cm`) & Secret (`secret`)
* **What it is**:
  * **ConfigMap**: Stores plain-text key-value configuration or configuration files.
  * **Secret**: Stores sensitive data (base64 encoded by default, e.g., passwords, TLS certs, tokens).
* **Visual in 3D Canvas**: Amber Key / File Card (`#f59e0b`).

#### Detailed Output (`kubectl get configmaps,secrets`)
```text
NAME                         DATA   AGE
configmap/app-settings       3      5d
secret/database-credentials  2      5d
```

---

### 3.2 PersistentVolumeClaim (`pvc`) & PersistentVolume (`pv`)
* **What it is**:
  * **PV**: Physical or cloud storage provisioned in the cluster (EBS, GPD, NFS).
  * **PVC**: A developer's request for storage ("give me 10Gi with ReadWriteOnce").
* **Visual in 3D Canvas**: Silver Cylinder / Disk (`#64748b`).

#### Detailed Output (`kubectl get pvc,pv`)
```text
NAME                                  STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistentvolumeclaim/data-postgres-0 Bound    pvc-8cf34871-38e9-4e08-9df2-5f654b1f4962   20Gi       RWO            standard       2d

NAME                                                        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                     STORAGECLASS   AGE
persistentvolume/pvc-8cf34871-38e9-4e08-9df2-5f654b1f4962   20Gi       RWO            Delete           Bound    default/data-postgres-0   standard       2d
```

---

## 4. Governance, Scaling & Autoscaling

---

### 4.1 HorizontalPodAutoscaler (`hpa`)
* **What it is**: Automatically scales the number of Pod replicas in a Deployment or StatefulSet based on CPU/memory utilization or custom metrics.
* **Visual in 3D Canvas**: Dynamic Scaling Chevron (`#38bdf8`).

#### Detailed Output (`kubectl get hpa`)
```text
NAME        REFERENCE                 TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
auth-hpa    Deployment/auth-service   42%/75% CPU     2         10        3          4d
```

---

### 4.2 ResourceQuota (`quota`) & LimitRange (`limits`)
* **What it is**:
  * **ResourceQuota**: Hard ceiling on aggregate resources (total CPU, memory, number of pods) allowed in a namespace.
  * **LimitRange**: Default, min, and max CPU/memory constraints per individual Pod/Container.

#### Detailed Output (`kubectl describe quota compute-quota`)
```text
Name:            compute-quota
Namespace:       staging
Resource         Used    Hard
--------         ----    ----
limits.cpu       1200m   4
limits.memory    2Gi     8Gi
pods             6       10
```

---

## 5. Security & Access Control (RBAC)

---

### 5.1 ServiceAccount (`sa`)
* **What it is**: An identity for processes running inside a Pod to authenticate against the Kubernetes API.

---

### 5.2 Role, ClusterRole, RoleBinding & ClusterRoleBinding
* **Role**: Defines permissions (verbs like `get`, `list`, `watch`, `create`) scoped to a single Namespace.
* **ClusterRole**: Defines permissions cluster-wide (or for non-namespaced resources like Nodes).
* **RoleBinding**: Binds a Role/ClusterRole to a user, group, or ServiceAccount inside a namespace.
* **ClusterRoleBinding**: Grants permissions across all namespaces in the entire cluster.

#### Simple YAML Spec (Role & Binding)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
  - kind: ServiceAccount
    name: monitor-sa
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

---

## 6. Cluster Control Plane & Nodes

---

```text
┌──────────────────────────────────────────────────────────────┐
│                     KUBERNETES CONTROL PLANE                 │
│                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌────────────┐   │
│   │  API Server  │◄───►│  etcd (DB)   │     │ Scheduler  │   │
│   └──────▲───────┘     └──────────────┘     └─────┬──────┘   │
│          │                                        │          │
│          │              ┌─────────────────────────┘          │
│          ▼              ▼                                    │
│   ┌───────────────────────────────┐                          │
│   │   Controller Manager (KCM)    │                          │
│   └───────────────────────────────┘                          │
└──────────────────┬───────────────────────────────────────────┘
                   │ Network Communication
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  WORKER NODE 1   │  │  WORKER NODE 2   │
│  ├── Kubelet     │  │  ├── Kubelet     │
│  ├── Kube-Proxy  │  │  ├── Kube-Proxy  │
│  └── Container R.│  └── Container R.│
└──────────────────┘  └──────────────────┘
```

* **kube-apiserver**: Front door of the cluster; exposes REST API; authenticates & validates requests.
* **etcd**: Consistent, highly-available key-value store for all cluster state data.
* **kube-scheduler**: Watches for newly created Pods with no assigned node, and selects a node for them.
* **kube-controller-manager**: Runs controllers that regulate cluster state (NodeController, DeploymentController).
* **kubelet**: Agent running on each node; ensures containers are running in Pods as described in PodSpecs.
* **kube-proxy**: Maintains network rules on nodes; handles Pod-to-Pod and Service IP forwarding.
* **Namespace (`ns`)**: Logical partition within a cluster to isolate projects, teams, or environments (e.g., `dev`, `staging`, `prod`).

---

## 7. Quick Diagnostic Command Cheatsheet

| Command | Purpose |
| :--- | :--- |
| `kubectl get pods -A` | List all pods across all namespaces |
| `kubectl describe pod <name>` | Show pod events, restart reasons, and health checks |
| `kubectl logs -f <name> -c <container>` | Stream live application stdout/stderr logs |
| `kubectl exec -it <name> -- /bin/sh` | Open interactive shell inside a container |
| `kubectl top nodes / pods` | Check real-time CPU and memory usage |
| `kubectl get events --sort-by=.metadata.creationTimestamp` | Check cluster-wide timeline of events & errors |

---

## 🧠 Memory Anchor for Autonomous Agents

When modifying or generating Kubernetes architectures or knowledge representations in this project:
1. **Always preserve human agency**: Provide transparent situational clarity rather than forcing rigid configurations.
2. **Concept Alignment**:
   * Any visual element placed on the 3D Drawing Canvas (`/dashboard/k8s-draw`) corresponds directly to the declarative YAML resource schemas detailed above.
   * Any concept created in the Knowledge Universe (`/dashboard/knowledge`) can reference these core Kubernetes primitives and their standard port/label relationships.
