/*;=============================================   
; Author           :  Global Software's    
; Create date      :  19/01/2023    
; Create By        :  ASLAM  
; Description      :  PIECE_Stock  UPDATe
; Change Person    :  ASLAM
; Last Change Date :  15/10/2025 10.35 AM 
; =============================================  */  
CREATE PROCEDURE PROC_PiecesReceipt_Update (@Id Int,@StyleNo Varchar(20),@ColID Int,@PartId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15),@RewrkPcs int=0,@RejPcs int=0) AS  DECLARE @Coycode Int,@Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@SourceStageId






 Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int ,@OldId Int,@OldCoycode Int,@OldOrdid Int,@OldStyleNo Varchar(20),@OldStageId Int,@OldPartId Int,@OldGodId Int,@OldColId Int,@OldSizeId Int,@OldStockQty Int,@OldSourceStageId Int,  @OldFinalStage Char(1),@OldSeqNo int,@OldPartyId Int,@OldPcsStockId Int,@OldStageId1 Int,@StageId1 Int,@OldGrnType varchar(20),@GrnType varchar(20),@ProcessType Char(1),@RejectionTypeId Int   ,@DCStageID Int  ,@LotId Int,@SemiFinishDept Varchar(1),@OldRewrkStock int,@OldRejStock int,@StockRewrkPcs int,@StockRejPcs int







Select @OldId=@Id   



Select @OldCoycode = Coycode From Trs_PcsGrn1 Where Id=@OldId     



select @OldPartyId = Party From	 Trs_PcsGrn1 Where Id=@OldId    



SELECT @OldOrdid = Ordjob From Trs_PcsGrn1 Where Id=@OldId    



SELECT @OldStyleNo = @StyleNo    



SELECT @OldStageid = TargetStageId From Trs_PcsGrn1 Where Id=@OldId    



SELECT @OldPartId = @PartId      



SELECT @OldGodId = GodId From Trs_PcsGrn1 Where Id=@OldId     



SELECT @ProcessType = ProcessType from Trs_PcsGrn1 where id=@oldid     







SELECT @RejectionTypeId = Trs_Pcs1.RejectionTypeId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id  Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@OldId     







Select @OldSeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId  



SELECT @OldFinalStage = Mas_Dept.SemiFinish From Trs_PcsGrn1 Inner Join Mas_JobWrkComp On Trs_PcsGrn1.TargetStageID=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsGrn1.Id=@OldId      











SELECT @OldColId = @ColId    



SELECT @OldSizeId = @SizeId  



SELECT @OldStockQty = RecPcs from trs_Pcsgrn2 where Id = @ID and StyleNo = @StyleNo And colId = @ColId and PartId = @PartID And SizID = @SizeId And LotNo= @LotNo  	 



SELECT @OldRewrkStock = isNull(RewrkPcs,0) from trs_Pcsgrn2 where Id = @ID and StyleNo = @StyleNo And colId = @ColId and PartId = @PartID And SizID = @SizeId And LotNo= @LotNo  	 



SELECT @OldRejStock = isNull(RejPcs,0) from trs_Pcsgrn2 where Id = @ID and StyleNo = @StyleNo And colId = @ColId and PartId = @PartID And SizID = @SizeId And LotNo= @LotNo  	 



Select @OldGrnType = GrnType from trs_pcsgrn1 Where Id=@OldId    



SELECT @DCStageID = Trs_Pcs1.TargetStageID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob  And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@OldId     







IF ltrim(@LotNo)<>'' 



SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  



ELSE  



SELECT @LotId = 0   



Select @SemiFinishDept=Mas_Dept.SEMIFINISH From Mas_Dept INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Dept=Mas_Dept.DeptID Where Trs_PcsGrn1.ID=@Id   







If @oldGrnType='Process Return'    



BegiN     



If @SemiFinishDept='F'  



Select @OldStageId1 = Trs_Pcs1.TargetStageId From Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On    Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob INNER JOIN  Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And   Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo    Where Trs_PcsGrn1.id=@OldId    	



Else	     



Select @OldStageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join  Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1






.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo    Where Trs_PcsGrn1.id=@OldId   



End  



Else  



Begin  	



SELECT @OldStageId1 = TargetStageId From Trs_PcsGrn1 Where Id=@OldId  



if @OldStageId1 <> @DCStageID 



begin  



SELECT @OldStageId1 = @DCStageID  



end 



End   



begin  



If @OldFinalStage='S'  



Begin  	



print 'aaa'



If @OldGrnType='Process Return'  



BegiN  



print 'a' 

/* test */

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) + @OldRewrkStock ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) + @OldRejStock  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId   and Stageid=@OldStageId1 and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0
 Else @RejectionTypeId End  And ISNULL(Pcs_StockTable.EmpID,0) = 0



End  



Else 



Begin  



if @ProcessType<>'R'  



begin 



print 'b'



select * from Pcs_StockTableQty Where PcsStockId = 79 and SizeId =1



Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty +  @OldRewrkStock + @OldRejStock



/*,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) + @OldRewrkStock ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) + @OldRejStock */



From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and PartId=@OldPartId and GodId=









@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0 



select * from Pcs_StockTableQty Where PcsStockId = 79 and SizeId =1



End   







if @ProcessType='R'  



begin 



print 'c'  







Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) + @OldRewrkStock ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) + @OldRejStock From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and 	StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId And ISNULL(Pcs_StockTable.EmpID,0) = 0 end 



End  

/* For Bit Cutting Dc PartyWise */

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageid1)='Piece'  Or ((Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageid1)='Bit' And @OldStageId1 = -2 ) OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageid1)='Panel' 



Begin  



print 'd'  



Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@OldStockQty+@Pcs,Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty-@OldStockQty  



,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @OldRewrkStock + @RewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @OldRejStock + @RejPcs



From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId and Stageid=@OldStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=0 and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   And ISNULL(Pcs_StockTable.EmpID,0) = 0







select * from Pcs_StockTableQty Where PcsStockId = 79 and SizeId =1



End  



End   







If @OldFinalStage='F'  



Begin  



If @OldGrnType='Process Return'  



Begin  /*print 'e'*/



Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty 



,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) + @OldRewrkStock ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) + @OldRejStock



From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End
 And ISNULL(Pcs_StockTable.EmpID,0) = 0





End 



Else  



Begin  



if @ProcessType='R'  begin  /*Edit Time, Add the OldStockQty in Mistake Pcs*/  /* print 'f' */ Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,


0) + @OldRewrkStock ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) + @OldRejStock



 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and GodId=@OldGodId and PartyId=






@OldPartyId and  Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId  And ISNULL(Pcs_StockTable.EmpID,0) = 0  



end  



Else   



Begin  







print 'g'



Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) + @OldRewrkStock ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) + @OldRejStock From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId  and Stageid=@OldStageid1 and GodId







=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0  And ISNULL(Pcs_StockTable.EmpID,0) = 0  



End   



End    



If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageid1)='Piece'  OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageid1)='Panel'  



Begin   



print 'h' 



Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@OldStockQty + @OldRewrkStock + @OldRejStock)



,Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty-@OldStockQty 







/*,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @OldRewrkStock ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @OldRejStock */







From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo And LotId = @LotId and Stageid=@OldStageId and GodId=@OldGodId and PartyId=0 and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   And ISNULL(Pcs_StockTable.EmpID,0) = 0



End   



End   



End   



Select @Id=@Id 



Select @Coycode = Coycode From Trs_PcsGrn1 Where Id=@Id   



select @PartyId = Party From Trs_PcsGrn1 Where Id=@Id   



SELECT @Ordid = Ordjob From Trs_PcsGrn1 Where Id=@Id     



SELECT @StyleNo = @StyleNo  



SELECT @Stageid = TargetStageId From Trs_PcsGrn1 Where Id=@Id   



SELECT @PartId = @PartId    



SELECT @GodId = GodId From Trs_PcsGrn1 Where Id=@Id   



Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@Ordid And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId   



SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsGrn1 Inner Join Mas_JobWrkComp On Trs_PcsGrn1.TargetStageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsGrn1.Id=@Id   



SELECT @ColId = @ColId  



SELECT @SizeId = @SizeId   



SELECT @StockQty = @Pcs    



SELECT @StockRewrkPcs = @RewrkPcs



SELECT @StockRejPcs = @RejPcs



Select @GrnType = GrnType from trs_pcsgrn1 Where Id=@Id    



If @GrnType='Process Return'    



Begin   



/*



select @StageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.Ord


Job And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.Lotno = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@Id    */







Select @StageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id  



INNER JOIN Trs_PcsGrn4_PackingDCDet C ON Trs_Pcs1.Id = C.DCId And Trs_Pcs2.StyleNo = C.Styleno And Trs_Pcs2.PartID = C.PartId And Trs_Pcs2.ColID = C.ColId 



And Trs_Pcs2.SizeID = C.SizeId And trs_Pcs1.TargetStageID = C.DCStageId  where C.id=@ID GROUP BY Trs_Pcs1.TargetStageId







End    



Else    



Begin   



SELECT @StageId1 = TargetStageId From Trs_PcsGrn1 Where Id=@Id   



if @StageId1 <> @DCStageID   



begin   



SELECT @StageId1 = @DCStageID   



end   



End   



begin    



If @FinalStage='S'    



Begin     



If @GrnType='Process Return'    



Begin   







  Update  Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @StockRejPcs



  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@StageId1 And LotId = @LotId  and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End   
And ISNULL(Pcs_StockTable.EmpID,0) = 0





End    



Else    



Begin    



if @ProcessType='R'   begin   



print 'j'  



Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @StockRejPcs 






From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And   LotId = @LotId  and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId  And ISNULL(Pcs_StockTable.EmpID,0) = 0



end   



else  



begin   



print 'l' 



print @partyid



print @stockQty



print @StockRewrkPcs



print @StockRejPcs



--Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty 







--,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @StockRejPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId  and Stageid=@Stageid1 and PartId=@PartId and 







--GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   







Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@StockQty + @StockRewrkPcs + @StockRejPcs  )







/*,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @StockRejPcs */ From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId  and Stageid=@Stageid1 and PartId=@PartId and 







GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   And ISNULL(Pcs_StockTable.EmpID,0) = 0



select * from Pcs_StockTableQty Where PcsStockId = 79 and SizeId =1



end   



print 'll'



End    



/*



If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece'    



Begin   



SELECT k =0 /*print 'm' */ /*Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty,Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty+@StockQty  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_St


ockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.



ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0     */  End    



*/



End     



print 'lll'



If @FinalStage='F'    



BegiN    



print 'l4'



If @GrnType='Process Return'    



Begin   



print 'n' 







  Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @StockRejPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@StageId1 and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End And ISNULL(Pcs_StockTable.EmpID,0) = 0



End    



Else   



Begin    



print 'l5'



if @ProcessType='R'   



Begin   



print 'o' 



   Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @StockRejPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@Stageid1 and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId     And ISNULL(Pcs_StockTable.EmpID,0) = 0



End   



Else   



Begin   



print 'p'  



Update Pcs_StockTableQty Set  Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0)



 - @StockRejPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@Stageid1 and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0     And ISNULL(Pcs_StockTable.EmpID,0) = 0







End   



End     



If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece'   OR  (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@Stageid1)='Panel' 



Begin    



print 'q'   



Update Pcs_StockTableQty  Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty,Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty+@StockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) + @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) + @StockRejPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where















 coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@StageId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0    











End    







End   











ELSE

BEGIN

If @GrnType='Process Return'     

begin

/* TEST */

 Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty ,Pcs_StockTableQty.RewrkStk = isNull(Pcs_StockTableQty.RewrkStk,0) - @StockRewrkPcs ,Pcs_StockTableQty.RejStk = isNull(Pcs_StockTableQty.RejStk,0) - @StockRejPcs
 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@DCStageID and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End And ISNULL(Pcs_StockTable.EmpID,0) = 0 and PartId=@PartId

 End

END



End
