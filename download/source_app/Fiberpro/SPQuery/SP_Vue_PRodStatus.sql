/*;=============================================   
; Author           :  Global Software's    
; Create date      :  31/12/2022    
; Create By        :  ASLAM 
; Description      :  SP FOR SHIFTWAGES REG
; Change Person    :  ASLAM
; Last Change Date :  08/04/2023 10.01 AM 
; =============================================  */  
CREATE PROCEDURE SP_Vue_PRodStatus   AS 
BEGIN 

DECLARE @sql1 NVARCHAR(MAX);

SET @sql1 = ' ALTER VIEW Vue_PRodStatus as Select X.coycode,X.Ordid,X.Styleno,X.PartId,X.ColId,x.sizeId,isNull(Sum(X.Cutpcs),0) as CutPcs,isNull(Sum(LineFeedPcs),0) as LineFeedPcs,isNull(Sum(LineoutputPcs),0) as LineoutputPcs,IsNull(Sum(Goodpcs),0) as GoodPcs,IsNull(sum(rejectPcs),0) as RejectPcs,IsNull(Sum(ReworkWIP),0) as ReworkWIP from (Select A.Coyid as Coycode, A.OrdId,a.StyleNo,a.PartID,a.Clrid as colid,b.SizID as SizeID,sum(b.ProdPcs) as CutPcs , 0 as LineFeedPcs,0 as LineoutputPcs,0 as Goodpcs, 0 as RejectPcs,
0 as ReworkWIP From  Trs_Prodentry a inner join Trs_ProdentryQty B on A.Id = B.Id WHERE isnull(Rework,0)=0 and StageId =1 group by A.Coyid ,A.OrdId,A.StyleNo,A.PartID,A.Clrid,B.SizID UNION Select b.Coycode, B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID,0 as Cutpcs,Sum(Pcs) as LineFeedpcs ,0 as Lineoutputpcs,0 as Goodpcs,0 as RejectPcs,0 as ReworkWIP From (Select Distinct BundleMasID,Bundleid,Ordid,StyleNo,LotNo,StyleID,Part,EmpName,Coycode From Pay_BarcodeGeneration )B INNER JOIN Pay_CuttProdMas C ON
 B.BundleMasID = C.ID INNER JOIN Pay_CuttProd_Bundle D ON  D.Id = c.Id and B.bundleMasId = D.Id And B.BundleID = D.BundleId   INNER JOIN Pay_Bundle_IsstoLine PB ON b.BundleMasID = PB.BundleMasId and B.BundleID = PB.BundleID  INNER JOIN mas_exporter F ON  
B.Coycode = F.ExpID inner join Mas_Part on b.Part=Mas_Part.PartName  group by b.coycode,B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID  UNION   Select A.coycode, B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID,0 as Cutpcs,0 as LineFeedpcs,sum(a.Pcs) as Lineoutputpcs,0 as Goodpcs , 0 as RejectPcs,0 as ReworkWIP From Pay_Pcs_ProdEntry A INNER JOIN (Select Distinct BundleMasID,Bundleid,Ordid,StyleNo,LotNo,StyleID,Part,EmpName,Coycode From Pay_BarcodeGeneration )B ON  A.BundleMasid = B.BundleMasID And 
A.BundleId =B.BundleId  INNER JOIN Pay_CuttProdMas C ON A.BundleMasID = C.ID INNER JOIN Pay_CuttProd_Bundle D ON  D.Id = c.Id and a.bundleMasId = D.Id And A.BundleID = D.BundleId  INNER JOIN Mas_JobWrkComp E ON  A.StageId = E.ID   inner join Mas_Part on b.Part=Mas_Part.PartName WHERE isnull(wORKtYPE,''N'')=''N''  group by A.coycode,B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID UNION  Select A.coycode, B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID,0 as Cutpcs,0 as LineFeedpcs,0 as Lineoutputpcs, sum(
a.pcs) as goodpcs,0 as RejectPcs,0 as ReworkWIP From Pay_Pcs_ProdEntry A INNER JOIN (Select Distinct BundleMasID,Bundleid,Ordid,StyleNo,LotNo,StyleID,Part,EmpName,Coycode From Pay_BarcodeGeneration )B ON  A.BundleMasid = B.BundleMasID And A.BundleId =B.BundleId  INNER JOIN Pay_CuttProdMas C ON A.BundleMasID = C.ID INNER JOIN Pay_CuttProd_Bundle D ON  D.Id = c.Id and a.bundleMasId = D.Id And A.BundleID = D.BundleId  INNER JOIN Mas_JobWrkComp E ON  A.StageId = E.ID   inner join Mas_Part on b.Part=Mas_Part.PartName WHERE isnull(wORKtYPE,''N'')=''N''   and isNull(ReworkFlg,''N'') =''N'' group by A.coycode,B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID UNION  Select A.coycode, B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID,0 as Cutpcs,0 as LineFeedpcs,0 as Lineoutputpcs, 0 as goodpcs,sum(a.Pcs) as RejectPcs,0 as ReworkWIP From Pay_Pcs_ProdEntry A INNER JOIN (Select Distinct BundleMasID,Bundleid,Ordid,StyleNo,LotNo,StyleID,Part,EmpName,Coycode From Pay_BarcodeGeneration )B ON  A.BundleMasid = B.BundleMasID And 
A.BundleId =B.BundleId  INNER JOIN Pay_CuttProdMas C ON A.BundleMasID = C.ID INNER JOIN Pay_CuttProd_Bundle D ON  D.Id = c.Id and a.bundleMasId = D.Id And A.BundleID = D.BundleId  INNER JOIN Mas_JobWrkComp E ON  A.StageId = E.ID   inner join Mas_Part on b.Part=Mas_Part.PartName WHERE isnull(wORKtYPE,''N'')=''R''   and isNull(ReworkFlg,''N'') =''N'' group by A.coycode,B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID UNION Select A.coycode, B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID,0 as Cutpcs,0 as LineFeedpcs,0 as Lineoutputpcs, 0 as goodpcs,0 as RejectPcs, 0 as ReworkWIP From Pay_Pcs_ProdEntry A INNER JOIN (Select Distinct BundleMasID,Bundleid,Ordid,StyleNo,LotNo,StyleID,Part,EmpName,Coycode From Pay_BarcodeGeneration )B ON  A.BundleMasid = B.BundleMasID And A.BundleId =B.BundleId  INNER JOIN Pay_CuttProdMas C ON A.BundleMasID = C.ID INNER JOIN Pay_CuttProd_Bundle D ON  D.Id = c.Id and a.bundleMasId = D.Id And A.BundleID = D.BundleId  INNER JOIN Mas_JobWrkComp E ON  A.StageId = E.ID   inner join Mas_Part on b.Part=Mas_Part.PartName WHERE isnull(wORKtYPE,''N'')=''R''   and isNull(ReworkFlg,''N'') =''N'' group by A.coycode,B.OrdId,B.StyleNo,Mas_Part.PartID,c.Colid,d.SizeID ) X Group by X.coycode,X.Ordid,X.Styleno,X.PartId,X.ColId,x.sizeId'

EXEC sp_executesql @sql1 

END


-- SP_Vue_RptShiftWagesReg  