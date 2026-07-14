import json
import os
import threading
import uuid
from copy import deepcopy

class LocalCursor:
    def __init__(self, data, projection=None):
        self.data = []
        for doc in data:
            doc_copy = deepcopy(doc)
            if projection:
                # 1 = include, 0 = exclude
                include_only = [k for k, v in projection.items() if v == 1 or v is True]
                exclude = [k for k, v in projection.items() if v == 0 or v is False]
                if include_only:
                    new_doc = {}
                    for k in include_only:
                        if k in doc_copy:
                            new_doc[k] = doc_copy[k]
                    # By default, mongo includes _id unless explicitly excluded.
                    if "_id" in doc_copy and "_id" not in exclude and "_id" not in include_only:
                        new_doc["_id"] = doc_copy["_id"]
                    doc_copy = new_doc
                else:
                    for k in exclude:
                        doc_copy.pop(k, None)
            self.data.append(doc_copy)
        self.sort_key = None
        self.sort_dir = 1
        self.limit_val = None

    def sort(self, key, direction=-1):
        self.sort_key = key
        self.sort_dir = direction
        reverse = (direction == -1)
        
        # Sort items safely handling missing keys or different types
        def sort_val(x):
            val = x.get(key)
            if val is None:
                return ""
            return val
            
        self.data.sort(key=sort_val, reverse=reverse)
        return self

    def limit(self, n):
        self.limit_val = n
        if n is not None:
            self.data = self.data[:n]
        return self

    def __iter__(self):
        return iter(self.data)

    def __next__(self):
        if not hasattr(self, '_iter_obj'):
            self._iter_obj = iter(self.data)
        try:
            return next(self._iter_obj)
        except StopIteration:
            del self._iter_obj
            raise StopIteration

class LocalCollection:
    def __init__(self, db_path, collection_name, lock):
        self.db_path = db_path
        self.collection_name = collection_name
        self.lock = lock

    def _load(self):
        if not os.path.exists(self.db_path):
            return {}
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save(self, data):
        try:
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving to local mock database: {e}")

    def insert_one(self, doc):
        with self.lock:
            data = self._load()
            if self.collection_name not in data:
                data[self.collection_name] = []
            
            doc_copy = deepcopy(doc)
            if "_id" not in doc_copy:
                doc_copy["_id"] = str(uuid.uuid4())
            
            data[self.collection_name].append(doc_copy)
            self._save(data)
            
            class InsertResult:
                def __init__(self, inserted_id):
                    self.inserted_id = inserted_id
            return InsertResult(doc_copy["_id"])

    def find(self, filter_query=None, projection=None):
        with self.lock:
            data = self._load()
            docs = data.get(self.collection_name, [])
            
            filtered = []
            filter_query = filter_query or {}
            for doc in docs:
                match = True
                for k, v in filter_query.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    filtered.append(doc)
            
            return LocalCursor(filtered, projection)

    def find_one(self, filter_query=None):
        cursor = self.find(filter_query)
        if cursor.data:
            return cursor.data[0]
        return None

    def count_documents(self, filter_query=None):
        cursor = self.find(filter_query)
        return len(cursor.data)

    def update_one(self, filter_query, update_query):
        with self.lock:
            data = self._load()
            docs = data.get(self.collection_name, [])
            
            matched_index = -1
            filter_query = filter_query or {}
            for idx, doc in enumerate(docs):
                match = True
                for k, v in filter_query.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    matched_index = idx
                    break
            
            class UpdateResult:
                def __init__(self, modified_count):
                    self.modified_count = modified_count

            if matched_index != -1:
                doc = docs[matched_index]
                if "$push" in update_query:
                    for field, val in update_query["$push"].items():
                        if field not in doc:
                            doc[field] = []
                        if isinstance(doc[field], list):
                            doc[field].append(val)
                if "$set" in update_query:
                    for field, val in update_query["$set"].items():
                        doc[field] = val
                
                data[self.collection_name][matched_index] = doc
                self._save(data)
                return UpdateResult(1)
            
            return UpdateResult(0)

    def delete_many(self, filter_query=None):
        with self.lock:
            data = self._load()
            docs = data.get(self.collection_name, [])
            
            filter_query = filter_query or {}
            remaining = []
            deleted_count = 0
            for doc in docs:
                match = True
                for k, v in filter_query.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    deleted_count += 1
                else:
                    remaining.append(doc)
            
            data[self.collection_name] = remaining
            self._save(data)
            
            class DeleteResult:
                def __init__(self, deleted_count):
                    self.deleted_count = deleted_count
            return DeleteResult(deleted_count)

    def delete_one(self, filter_query=None):
        with self.lock:
            data = self._load()
            docs = data.get(self.collection_name, [])
            
            filter_query = filter_query or {}
            remaining = []
            deleted_count = 0
            for doc in docs:
                if deleted_count == 0:
                    match = True
                    for k, v in filter_query.items():
                        if doc.get(k) != v:
                            match = False
                            break
                    if match:
                        deleted_count = 1
                        continue
                remaining.append(doc)
            
            data[self.collection_name] = remaining
            self._save(data)
            
            class DeleteResult:
                def __init__(self, deleted_count):
                    self.deleted_count = deleted_count
            return DeleteResult(deleted_count)

class LocalDatabase:
    def __init__(self, db_path, lock):
        self.db_path = db_path
        self.lock = lock
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = LocalCollection(self.db_path, name, self.lock)
        return self.collections[name]

class LocalMongoClient:
    def __init__(self, uri=None, **kwargs):
        self.uri = uri
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, "data")
        os.makedirs(data_dir, exist_ok=True)
        self.db_path = os.path.join(data_dir, "db.json")
        self.lock = threading.Lock()
        self.dbs = {}

    def __getitem__(self, db_name):
        if db_name not in self.dbs:
            self.dbs[db_name] = LocalDatabase(self.db_path, self.lock)
        return self.dbs[db_name]
